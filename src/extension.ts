import * as vscode from 'vscode';

/**
 * Two decoration types:
 * 1) Dim decoration - for lines not currently "focused".
 */
let dimDecoration: vscode.TextEditorDecorationType;

// Add this at the top with other declarations
let outputChannel: vscode.OutputChannel;
let isEnabled: boolean = true;

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
    const config = vscode.workspace.getConfiguration('limelight');
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
 * Finds the range of the paragraph containing the given line
 * A paragraph is defined as a block of text surrounded by blank lines
 */
function findParagraphRange(document: vscode.TextDocument, lineNumber: number): vscode.Range {
  try {
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

    return new vscode.Range(
      startLine, 0,
      endLine, document.lineAt(endLine).text.length
    );
  } catch (error) {
    Logger.getInstance().error('Error finding paragraph range', error as Error);
    // Return a safe fallback - just the current line
    return new vscode.Range(lineNumber, 0, lineNumber, document.lineAt(lineNumber).text.length);
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
    const config = vscode.workspace.getConfiguration('limelight');
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
    const config = vscode.workspace.getConfiguration('limelight');
    const dimOpacity = config.get<number>('dimOpacity', 0.3);

    // Dispose of existing decoration if it exists
    if (dimDecoration) {
      dimDecoration.dispose();
    }

    // Create new decoration with updated settings
    dimDecoration = vscode.window.createTextEditorDecorationType({
      opacity: dimOpacity.toString()
    });

    // Update all visible editors
    updateDecorations();
  } catch (error) {
    Logger.getInstance().error('Error updating decoration types', error as Error);
    vscode.window.showErrorMessage('Error updating Limelight decorations. Check output for details.');
  }
}

/**
 * This function is called when your extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {
  try {
    // Create output channel
    outputChannel = vscode.window.createOutputChannel('Limelight');
    
    // Initialize logger and update its state
    const logger = Logger.getInstance();
    logger.updateLoggingState();
    logger.log('Extension "limelight" is now active!');

    // Initialize decorations
    updateDecorationTypes();

    // Listen for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('limelight')) {
          logger.log('Configuration changed, updating settings');
          logger.updateLoggingState();
          updateDecorationTypes();
        }
      })
    );

    // Register the toggle command
    let toggleCommand = vscode.commands.registerCommand('limelight.toggle', () => {
      isEnabled = !isEnabled;
      logger.log(`Limelight ${isEnabled ? 'enabled' : 'disabled'}`);
      
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
      vscode.window.setStatusBarMessage(`Limelight ${isEnabled ? 'enabled' : 'disabled'}`, 3000);
    });

    context.subscriptions.push(toggleCommand);

    // Listen for selection changes in any text editor
    context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection(
        e => {
          logger.log('Selection changed');
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
          updateDecorations().catch(error => {
            logger.error('Error updating decorations on visible range change', error);
          });
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
    vscode.window.showErrorMessage('Error activating Limelight extension. Check output for details.');
  }
}

/**
 * Called when your extension is deactivated.
 */
export function deactivate() {
  try {
    Logger.getInstance().log('Extension "limelight" is now deactivated!');
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
    // If disabled, don't apply any decorations
    if (!isEnabled) {
      return;
    }

    // 1. Get the currently active editor
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      logger.log('No active text editor; cannot update decorations.');
      return;
    }

    logger.log(`Updating decorations for: ${editor.document.fileName}`);

    // Get configuration
    const config = vscode.workspace.getConfiguration('limelight');
    const blockDetection = config.get<string>('blockDetection', 'paragraph');
    const paragraphMode = config.get<boolean>('paragraphMode', false);

    // Get the visible range with buffer
    const visibleRange = getVisibleRangeWithBuffer(editor);
    logger.log(`Visible range (with buffer): lines ${visibleRange.start.line + 1}-${visibleRange.end.line + 1}`);

    // 2. Create a list of ranges to dim within the visible range
    const doc = editor.document;
    const allRanges: vscode.Range[] = [];
    const selection = editor.selection;

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

    // 3. Add ranges for all visible lines except the focused ones
    for (let lineIdx = visibleRange.start.line; lineIdx <= visibleRange.end.line; lineIdx++) {
      // Skip lines within the excluded range
      if (lineIdx >= excludedRange.start.line && lineIdx <= excludedRange.end.line) {
        continue;
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
    vscode.window.showErrorMessage('Error updating Limelight decorations. Check output for details.');
  }
}
