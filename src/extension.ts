import * as vscode from 'vscode';

/**
 * Two decoration types:
 * 1) Dim decoration - for lines not currently "focused".
 */
let dimDecoration: vscode.TextEditorDecorationType;

// Add this at the top with other declarations
let outputChannel: vscode.OutputChannel;
let isEnabled: boolean = true;
let isInZenMode: boolean = false;

// Add this at the top with other declarations
let isScrolling: boolean = false;
let scrollTimeout: NodeJS.Timeout | undefined;
let lastScrollTime: number = 0;
let lastScrollPosition: number = -1; // Changed to -1 to detect first scroll
let consecutiveFastScrolls: number = 0;

/**
 * Logger utility to handle debug logging based on configuration
 */
class Logger {
  private static instance: Logger;
  private enableLogging: boolean = false;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public updateLoggingState() {
    const config = vscode.workspace.getConfiguration('codeglow');
    this.enableLogging = config.get<boolean>('enableLogging', false);
  }

  public log(message: string) {
    if (this.enableLogging) {
      outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
    }
  }

  public error(message: string, error?: Error) {
    // Always log errors, regardless of logging state
    const errorMessage = error ? `${message}: ${error.message}\n${error.stack}` : message;
    outputChannel.appendLine(`[ERROR] [${new Date().toISOString()}] ${errorMessage}`);
  }
}

/**
 * Performance tracking utility
 */
class PerformanceTracker {
  private static instance: PerformanceTracker;
  private metrics: Map<string, { count: number; totalTime: number; maxTime: number }> = new Map();
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  public async measure<T>(operation: string, fn: () => Promise<T> | T): Promise<T> {
    const start = process.hrtime.bigint();
    try {
      const result = await fn();
      this.recordMetric(operation, start);
      return result;
    } catch (error) {
      this.recordMetric(operation, start);
      throw error;
    }
  }

  private recordMetric(operation: string, startTime: bigint) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

    const metric = this.metrics.get(operation) || { count: 0, totalTime: 0, maxTime: 0 };
    metric.count++;
    metric.totalTime += duration;
    metric.maxTime = Math.max(metric.maxTime, duration);
    this.metrics.set(operation, metric);
  }

  public logMetrics() {
    this.logger.log('\n=== Performance Metrics ===');
    for (const [operation, metric] of this.metrics.entries()) {
      const avgTime = metric.totalTime / metric.count;
      this.logger.log(
        `${operation}:
         Count: ${metric.count}
         Avg Time: ${avgTime.toFixed(2)}ms
         Max Time: ${metric.maxTime.toFixed(2)}ms
         Total Time: ${metric.totalTime.toFixed(2)}ms`
      );
    }
  }

  public reset() {
    this.metrics.clear();
  }
}

/**
 * Finds the range of the paragraph containing the given line
 * A paragraph is defined as a block of text surrounded by blank lines
 */
function findParagraphRange(document: vscode.TextDocument, lineNumber: number): vscode.Range {
  try {
    // Validate input line number
    if (lineNumber < 0 || lineNumber >= document.lineCount) {
      Logger.getInstance().error(`Invalid line number: ${lineNumber}, document has ${document.lineCount} lines`);
      return new vscode.Range(0, 0, 0, 0);
    }

    let startLine = lineNumber;
    let endLine = lineNumber;

    // Scan upward until we find a blank line or start of file
    while (startLine > 0) {
      const line = document.lineAt(startLine - 1);
      if (line.isEmptyOrWhitespace) {
        break;
      }
      startLine--;
    }

    // Scan downward until we find a blank line or end of file
    while (endLine < document.lineCount - 1) {
      const line = document.lineAt(endLine + 1);
      if (line.isEmptyOrWhitespace) {
        break;
      }
      endLine++;
    }

    // Double check line numbers are still valid (document could have changed)
    if (endLine >= document.lineCount) {
      endLine = document.lineCount - 1;
    }

    return new vscode.Range(
      startLine, 0,
      endLine, document.lineAt(endLine).text.length
    );
  } catch (error) {
    Logger.getInstance().error('Error finding paragraph range', error as Error);
    // Return a safe fallback - empty range at start of document
    return new vscode.Range(0, 0, 0, 0);
  }
}

/**
 * Finds the smallest symbol that contains the given position
 */
async function findEnclosingSymbol(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Range | undefined> {
  try {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      document.uri
    );

    if (!symbols || symbols.length === 0) {
      outputChannel.appendLine('No symbols found in document');
      return undefined;
    }

    // Helper function to recursively find the smallest enclosing symbol
    function findSmallestEnclosingSymbol(symbols: vscode.DocumentSymbol[], position: vscode.Position): vscode.DocumentSymbol | undefined {
      let smallestSymbol: vscode.DocumentSymbol | undefined;
      
      for (const symbol of symbols) {
        if (symbol.range.contains(position)) {
          // If we haven't found a symbol yet, or this one is smaller than our current best
          if (!smallestSymbol || symbol.range.end.line - symbol.range.start.line < 
              smallestSymbol.range.end.line - smallestSymbol.range.start.line) {
            smallestSymbol = symbol;
          }
          
          // Check children recursively
          const childSymbol = findSmallestEnclosingSymbol(symbol.children || [], position);
          if (childSymbol) {
            // If we found a child symbol, it's necessarily smaller than the parent
            smallestSymbol = childSymbol;
          }
        }
      }
      
      return smallestSymbol;
    }

    const enclosingSymbol = findSmallestEnclosingSymbol(symbols, position);
    if (enclosingSymbol) {
      outputChannel.appendLine(`Found enclosing symbol: ${enclosingSymbol.name} (${enclosingSymbol.kind})`);
      return enclosingSymbol.range;
    }

    outputChannel.appendLine('No enclosing symbol found for current position');
    return undefined;
  } catch (error) {
    outputChannel.appendLine(`Error finding symbols: ${error}`);
    return undefined;
  }
}

/**
 * Gets the visible range of the editor with a buffer zone
 */
function getVisibleRangeWithBuffer(editor: vscode.TextEditor): vscode.Range {
  try {
    const visibleRanges = editor.visibleRanges;
    if (visibleRanges.length === 0) {
      return new vscode.Range(0, 0, 0, 0);
    }

    // Get buffer size from configuration
    const config = vscode.workspace.getConfiguration('codeglow');
    const bufferLines = config.get<number>('bufferLines', 50);

    // Combine all visible ranges and add buffer
    let startLine = visibleRanges[0].start.line;
    let endLine = visibleRanges[visibleRanges.length - 1].end.line;

    // Add buffer lines above and below
    startLine = Math.max(0, startLine - bufferLines);
    endLine = Math.min(editor.document.lineCount - 1, endLine + bufferLines);

    Logger.getInstance().log(`Calculated visible range with buffer: ${startLine + 1}-${endLine + 1}`);
    return new vscode.Range(
      startLine, 0,
      endLine, editor.document.lineAt(endLine).text.length
    );
  } catch (error) {
    Logger.getInstance().error('Error calculating visible range', error as Error);
    // Return a safe fallback - just the visible ranges without buffer
    return editor.visibleRanges[0] || new vscode.Range(0, 0, 0, 0);
  }
}

/**
 * Creates or updates decorations based on current configuration
 */
function updateDecorationTypes() {
  try {
    // Get configuration
    const config = vscode.workspace.getConfiguration('codeglow');
    const dimOpacity = config.get<number>('dimOpacity', 0.3);

    // Dispose of existing decoration if it exists
    if (dimDecoration) {
      dimDecoration.dispose();
    }

    // Create new decoration with updated settings
    dimDecoration = vscode.window.createTextEditorDecorationType({
      opacity: dimOpacity.toString(),
      textDecoration: `none; transition: opacity 180ms ease-in-out`
    });

    // Update all visible editors
    updateDecorations();
  } catch (error) {
    Logger.getInstance().error('Error updating decoration types', error as Error);
    vscode.window.showErrorMessage('Error updating CodeGlow decorations. Check output for details.');
  }
}

/**
 * This function is called when your extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {
  try {
    // Create output channel
    outputChannel = vscode.window.createOutputChannel('CodeGlow');
    
    // Initialize logger and update its state
    const logger = Logger.getInstance();
    logger.updateLoggingState();
    logger.log('Extension "codeglow" is now active!');

    // Initialize decorations
    updateDecorationTypes();

    // Track Zen Mode state changes
    context.subscriptions.push(
      vscode.window.onDidChangeWindowState(e => {
        // VS Code doesn't provide a direct API to check Zen Mode
        // We'll check if the window is fullscreen as a proxy
        isInZenMode = e.focused && vscode.window.state.focused;
        logger.log(`Window state changed - treating as Zen Mode: ${isInZenMode}`);
        updateDecorations().catch(error => {
          logger.error('Error updating decorations on window state change', error);
        });
      })
    );

    // Also track active editor changes to detect Zen Mode
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        // Update Zen Mode state when editor changes
        isInZenMode = vscode.window.state.focused;
        updateDecorations().catch(error => {
          logger.error('Error updating decorations on editor change', error);
        });
      })
    );

    // Listen for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('codeglow')) {
          logger.log('Configuration changed, updating settings');
          logger.updateLoggingState();
          updateDecorationTypes();
        }
      })
    );

    // Register the toggle command
    let toggleCommand = vscode.commands.registerCommand('codeglow.toggle', () => {
      isEnabled = !isEnabled;
      logger.log(`CodeGlow ${isEnabled ? 'enabled' : 'disabled'}`);
      
      if (!isEnabled) {
        // Clear all decorations when disabled
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          editor.setDecorations(dimDecoration, []);
        }
      } else {
        // Re-apply decorations when enabled
        updateDecorations();
      }

      // Show status message to user
      vscode.window.setStatusBarMessage(`CodeGlow ${isEnabled ? 'enabled' : 'disabled'}`, 3000);
    });

    context.subscriptions.push(toggleCommand);

    // Register metrics dump command
    let metricsCommand = vscode.commands.registerCommand('codeglow.dumpMetrics', () => {
      const perfTracker = PerformanceTracker.getInstance();
      perfTracker.logMetrics();
      vscode.window.showInformationMessage('Performance metrics dumped to output channel');
    });

    context.subscriptions.push(metricsCommand);

    // Listen for selection changes in any text editor
    context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection(
        e => {
          logger.log('Selection changed');
          
          // Reset scrolling state and reapply decorations when selection changes
          isScrolling = false;
          if (scrollTimeout) {
            clearTimeout(scrollTimeout);
            scrollTimeout = undefined;
          }

          updateDecorations().catch(error => {
            logger.error('Error updating decorations on selection change', error);
          });
        }
      )
    );

    // Listen for when the user switches to a new (or different) text editor
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(
        editor => {
          if (editor) {
            logger.log(`Active editor changed to: ${editor.document.fileName}`);
            updateDecorations().catch(error => {
              logger.error('Error updating decorations on editor change', error);
            });
          }
        }
      )
    );

    // Listen for visible range changes
    context.subscriptions.push(
      vscode.window.onDidChangeTextEditorVisibleRanges(
        e => {
          logger.log('Visible ranges changed');
          
          // Get configuration
          const config = vscode.workspace.getConfiguration('codeglow');
          const disableWhileScrolling = config.get<boolean>('disableWhileScrolling', true);
          
          // If scroll handling is disabled, just update decorations normally
          if (!disableWhileScrolling) {
            updateDecorations().catch(error => {
              logger.error('Error updating decorations on visible range change', error);
            });
            return;
          }

          // Clear existing timeout if it exists
          if (scrollTimeout) {
            clearTimeout(scrollTimeout);
          }

          // Check if we should respond to this scroll event
          if (e.textEditor && e.textEditor.visibleRanges.length > 0) {
            const currentPosition = e.textEditor.visibleRanges[0].start.line;
            
            // Only clear decorations if scrolling fast or cursor is out of view
            if (!isScrolling && (isScrollingFast(e.textEditor, currentPosition) || !isCursorVisible(e.textEditor))) {
              isScrolling = true;
              e.textEditor.setDecorations(dimDecoration, []);
              logger.log('Cleared decorations due to fast scroll or cursor out of view');
            }
          }

          const debounceDelay = config.get<number>('scrollDebounceDelay', 250);

          // Set up new timeout to reapply decorations
          scrollTimeout = setTimeout(() => {
            isScrolling = false;
            
            // Only reapply decorations if the cursor is visible
            if (e.textEditor && isCursorVisible(e.textEditor)) {
              updateDecorations().catch(error => {
                logger.error('Error updating decorations after scroll', error);
              });
            } else {
              logger.log('Cursor not in visible range, keeping decorations cleared');
            }
          }, debounceDelay);
        }
      )
    );

    // Run once on activation (in case there's already an open editor)
    updateDecorations().catch(error => {
      logger.error('Error in initial decoration update', error);
    });

    // Add the output channel to disposables
    context.subscriptions.push(outputChannel);

  } catch (error) {
    Logger.getInstance().error('Error activating extension', error as Error);
    vscode.window.showErrorMessage('Error activating CodeGlow extension. Check output for details.');
  }
}

/**
 * Called when your extension is deactivated.
 */
export function deactivate() {
  try {
    Logger.getInstance().log('Extension "codeglow" is now deactivated!');
    if (dimDecoration) {
      dimDecoration.dispose();
    }
  } catch (error) {
    Logger.getInstance().error('Error deactivating extension', error as Error);
  }
}

/**
 * The main logic to figure out which lines should be dimmed.
 */
async function updateDecorations() {
  const logger = Logger.getInstance();
  
  try {
    const config = vscode.workspace.getConfiguration('codeglow');
    const onlyInZenMode = config.get<boolean>('onlyInZenMode', false);

    // If disabled, currently scrolling, or zen mode requirement not met, don't apply decorations
    if (!isEnabled || isScrolling || (onlyInZenMode && !isInZenMode)) {
      // Clear decorations if they exist
      const editor = vscode.window.activeTextEditor;
      if (editor && dimDecoration) {
        editor.setDecorations(dimDecoration, []);
      }
      return;
    }

    // 1. Get the currently active editor
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      logger.log('No active text editor; cannot update decorations.');
      return;
    }

    // Check for empty document
    if (editor.document.lineCount === 0) {
      logger.log('Document is empty; skipping decoration update.');
      return;
    }

    logger.log(`Updating decorations for: ${editor.document.fileName}`);

    // Get configuration
    const blockDetection = config.get<string>('blockDetection', 'paragraph');
    const paragraphMode = config.get<boolean>('paragraphMode', false);

    // Get the visible range with buffer
    const visibleRange = getVisibleRangeWithBuffer(editor);
    logger.log(`Visible range (with buffer): lines ${visibleRange.start.line + 1}-${visibleRange.end.line + 1}`);

    // Validate visible range is still within document bounds
    if (visibleRange.end.line >= editor.document.lineCount) {
      logger.log('Visible range exceeds document bounds, skipping decoration update');
      return;
    }

    // 2. Create a list of ranges to dim within the visible range
    const doc = editor.document;
    const allRanges: vscode.Range[] = [];
    const selection = editor.selection;

    // Validate selection is within document bounds
    if (selection.active.line >= doc.lineCount) {
      logger.log('Selection exceeds document bounds, skipping decoration update');
      return;
    }

    let excludedRange: vscode.Range;
    
    if (blockDetection === 'documentSymbols') {
      // Try to find enclosing symbol first
      const symbolRange = await findEnclosingSymbol(doc, selection.active);
      if (symbolRange) {
        excludedRange = symbolRange;
        logger.log(`Using symbol range: lines ${excludedRange.start.line + 1}-${excludedRange.end.line + 1}`);
      } else {
        // Fallback to line-based focusing if no symbol found
        excludedRange = new vscode.Range(
          selection.start.line, 0,
          selection.end.line, doc.lineAt(selection.end.line).text.length
        );
        logger.log('No symbol found, falling back to line-based focus');
      }
    } else if (paragraphMode) {
      // In paragraph mode, find the paragraph range containing the cursor
      excludedRange = findParagraphRange(doc, selection.active.line);
      logger.log(`Paragraph mode: excluding lines ${excludedRange.start.line + 1}-${excludedRange.end.line + 1}`);
    } else {
      // In normal mode, exclude the selected lines
      excludedRange = new vscode.Range(
        selection.start.line, 0,
        selection.end.line, doc.lineAt(selection.end.line).text.length
      );
    }

    // If there's a selection that spans multiple lines or characters, expand the excluded range
    if (!selection.isEmpty) {
      excludedRange = selection;
      logger.log(`Selection mode: excluding lines ${excludedRange.start.line + 1}-${excludedRange.end.line + 1}`);
    }

    // Validate excluded range is within document bounds
    if (excludedRange.end.line >= doc.lineCount) {
      logger.log('Excluded range exceeds document bounds, skipping decoration update');
      return;
    }

    // 3. Add ranges for all visible lines except the focused ones
    for (let lineIdx = visibleRange.start.line; lineIdx <= visibleRange.end.line; lineIdx++) {
      // Skip lines within the excluded range
      if (lineIdx >= excludedRange.start.line && lineIdx <= excludedRange.end.line) {
        continue;
      }

      // Double check line is still valid
      if (lineIdx >= doc.lineCount) {
        break;
      }

      const lineText = doc.lineAt(lineIdx).text;
      allRanges.push(new vscode.Range(
        lineIdx, 0,
        lineIdx, lineText.length
      ));
    }

    // 4. Apply the dim decoration to all non-focused lines within the visible range
    editor.setDecorations(dimDecoration, allRanges);

    logger.log(`Decorations applied to ${allRanges.length} visible lines.`);
  } catch (error) {
    logger.error('Error updating decorations', error as Error);
    vscode.window.showErrorMessage('Error updating CodeGlow decorations. Check output for details.');
  }
}

/**
 * Helper function to check if the cursor is within the visible range
 */
function isCursorVisible(editor: vscode.TextEditor): boolean {
  const cursorLine = editor.selection.active.line;
  return editor.visibleRanges.some(range => 
    cursorLine >= range.start.line && cursorLine <= range.end.line
  );
}

/**
 * Helper function to check if the scroll velocity exceeds the threshold
 */
function isScrollingFast(editor: vscode.TextEditor, currentPosition: number): boolean {
  const now = Date.now();
  
  // If this is the first scroll event, just update tracking
  if (lastScrollPosition === -1) {
    lastScrollTime = now;
    lastScrollPosition = currentPosition;
    consecutiveFastScrolls = 0;
    return false;
  }

  const timeDelta = now - lastScrollTime;
  const positionDelta = Math.abs(currentPosition - lastScrollPosition);
  
  // Reset consecutive count if too much time has passed
  if (timeDelta > 100) { // Reset if more than 100ms between scrolls
    consecutiveFastScrolls = 0;
  }

  // Ignore very small time deltas to avoid division by zero
  if (timeDelta < 16) { // ~60fps
    return false;
  }

  // Calculate velocity (lines per millisecond)
  const velocity = positionDelta / timeDelta;

  // Get configuration
  const config = vscode.workspace.getConfiguration('codeglow');
  const velocityThreshold = config.get<number>('scrollVelocityThreshold', 0.1);

  // Update tracking variables
  lastScrollTime = now;
  lastScrollPosition = currentPosition;

  // Track consecutive fast scrolls
  if (velocity > velocityThreshold) {
    consecutiveFastScrolls++;
  } else {
    consecutiveFastScrolls = 0;
  }

  Logger.getInstance().log(`Scroll velocity: ${velocity.toFixed(3)} lines/ms (threshold: ${velocityThreshold}, consecutive: ${consecutiveFastScrolls})`);
  
  // Require 2 consecutive fast scrolls to trigger
  return consecutiveFastScrolls >= 2;
}
