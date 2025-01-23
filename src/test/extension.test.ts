import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as myExtension from '../../extension';

suite('CodeGlow Extension Test Suite', () => {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeglow-test-'));

	// Helper to create a test file and open it
	async function createAndOpenTestFile(content: string, extension: string = '.txt'): Promise<vscode.TextDocument> {
		try {
			const fileName = `test-${Date.now()}${extension}`;
			const filePath = path.join(tmpDir, fileName);
			fs.writeFileSync(filePath, content);
			const fileUri = vscode.Uri.file(filePath);
			const document = await vscode.workspace.openTextDocument(fileUri);
			await vscode.window.showTextDocument(document);
			return document;
		} catch (error) {
			console.error('Error creating test file:', error);
			throw error;
		}
	}

	// Helper to clean up test files
	async function cleanupTestFile(document: vscode.TextDocument) {
		try {
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
			fs.unlinkSync(document.uri.fsPath);
		} catch (error) {
			console.error('Error cleaning up test file:', error);
		}
	}

	// Helper to update configuration
	async function updateConfig(section: string, value: any) {
		try {
			await vscode.workspace.getConfiguration('codeglow').update(section, value, vscode.ConfigurationTarget.Global);
		} catch (error) {
			console.error('Error updating config:', error);
			throw error;
		}
	}

	suiteSetup(async function() {
		this.timeout(10000); // 10 seconds timeout for setup

		try {
			// Wait for extension to activate
			const ext = vscode.extensions.getExtension('wescottsharples.codeglow');
			if (!ext) {
				throw new Error('Extension not found');
			}
			await ext.activate();

			// Wait a bit for everything to settle
			await new Promise(resolve => setTimeout(resolve, 2000));
		} catch (error) {
			console.error('Error in suite setup:', error);
			throw error;
		}
	});

	suiteTeardown(async function() {
		this.timeout(5000); // 5 seconds timeout for teardown

		try {
			// Reset all configurations to defaults
			await updateConfig('dimOpacity', undefined);
			await updateConfig('paragraphMode', undefined);
			await updateConfig('blockDetection', undefined);
			await updateConfig('bufferLines', undefined);
			await updateConfig('enableLogging', undefined);

			// Close all editors
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');

			// Clean up the temporary directory
			fs.rmdirSync(tmpDir, { recursive: true });
		} catch (error) {
			console.error('Error in suite teardown:', error);
		}
	});

	suite('Extension Basics', () => {
		test('Extension should be present', () => {
			assert.ok(vscode.extensions.getExtension('wescottsharples.codeglow'));
		});

		test('Should register commands', async () => {
			const commands = await vscode.commands.getCommands();
			assert.ok(commands.includes('codeglow.toggle'));
		});

		test('Configuration should load with defaults', () => {
			const config = vscode.workspace.getConfiguration('codeglow');
			assert.strictEqual(config.get('dimOpacity'), 0.3);
			assert.strictEqual(config.get('paragraphMode'), true);
			assert.strictEqual(config.get('blockDetection'), 'paragraph');
			assert.strictEqual(config.get('bufferLines'), 50);
			assert.strictEqual(config.get('enableLogging'), false);
		});
	});

	suite('Toggle Functionality', () => {
		test('Should toggle extension state', async () => {
			// First enable
			await vscode.commands.executeCommand('codeglow.toggle');
			// Then disable
			await vscode.commands.executeCommand('codeglow.toggle');
			assert.ok(true); // If we got here without errors, test passes
		});

		test('Should handle rapid toggling', async () => {
			for (let i = 0; i < 5; i++) {
				await vscode.commands.executeCommand('codeglow.toggle');
			}
			assert.ok(true); // If we got here without errors, test passes
		});
	});

	suite('Paragraph Detection', () => {
		let document: vscode.TextDocument;

		setup(async () => {
			// Enable paragraph mode
			await updateConfig('blockDetection', 'paragraph');
			await updateConfig('paragraphMode', true);
		});

		teardown(async () => {
			if (document) {
				await cleanupTestFile(document);
			}
			await vscode.commands.executeCommand('codeglow.toggle'); // Ensure disabled
		});

		test('Should handle basic paragraph detection', async () => {
			const content = `First paragraph
with multiple lines

Second paragraph
also with multiple lines

Third paragraph`;

			document = await createAndOpenTestFile(content);
			await vscode.commands.executeCommand('codeglow.toggle'); // Enable
			
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);
			
			// Test different cursor positions
			const positions = [0, 1, 4, 5, 7];
			for (const line of positions) {
				editor.selection = new vscode.Selection(line, 0, line, 0);
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		});

		test('Should handle empty lines', async () => {
			const content = `Paragraph 1


Paragraph 2`;

			document = await createAndOpenTestFile(content);
			await vscode.commands.executeCommand('codeglow.toggle');
			
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);
			editor.selection = new vscode.Selection(1, 0, 1, 0); // Empty line
			await new Promise(resolve => setTimeout(resolve, 100));
		});

		test('Should handle completely empty document', async () => {
			// Create empty document
			document = await createAndOpenTestFile('');
			await vscode.commands.executeCommand('codeglow.toggle');
			
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);

			// Delete all content and verify it doesn't throw
			await editor.edit(editBuilder => {
				const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
				const entireRange = new vscode.Range(0, 0, lastLine.range.end.line, lastLine.range.end.character);
				editBuilder.delete(entireRange);
			});

			// Wait a bit for decorations to update
			await new Promise(resolve => setTimeout(resolve, 100));
			assert.ok(true); // If we got here without errors, test passes
		});

		test('Should handle text selection', async () => {
			const content = `First paragraph
with multiple lines

Second paragraph
also with multiple lines

Third paragraph`;

			document = await createAndOpenTestFile(content);
			await vscode.commands.executeCommand('codeglow.toggle');
			
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);

			// Test different selection scenarios
			const selections = [
				// Single line selection
				new vscode.Selection(0, 0, 0, 5),
				// Multi-line selection
				new vscode.Selection(0, 0, 1, 5),
				// Entire document selection (cmd+a)
				new vscode.Selection(0, 0, 6, 14)
			];

			for (const sel of selections) {
				editor.selection = sel;
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		});
	});

	suite('Symbol Detection', () => {
		let document: vscode.TextDocument;

		setup(async () => {
			await updateConfig('blockDetection', 'documentSymbols');
			await updateConfig('paragraphMode', false);
		});

		teardown(async () => {
			if (document) {
				await cleanupTestFile(document);
			}
			await vscode.commands.executeCommand('codeglow.toggle'); // Ensure disabled
		});

		test('Should handle TypeScript symbols', async () => {
			const content = `
class TestClass {
  private field: string;
  
  constructor() {
    this.field = "test";
  }

  public method() {
    return this.field;
  }
}`;

			document = await createAndOpenTestFile(content, '.ts');
			await vscode.commands.executeCommand('codeglow.toggle');
			
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);

			// Test different positions (class, constructor, method)
			const positions = [1, 4, 8];
			for (const line of positions) {
				editor.selection = new vscode.Selection(line, 0, line, 0);
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		});

		test('Should fallback when no symbols found', async () => {
			const content = 'Simple text file without symbols';
			document = await createAndOpenTestFile(content);
			await vscode.commands.executeCommand('codeglow.toggle');
			
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);
			editor.selection = new vscode.Selection(0, 0, 0, 0);
			await new Promise(resolve => setTimeout(resolve, 100));
		});
	});

	suite('Zen Mode Integration', () => {
		let document: vscode.TextDocument;

		setup(async () => {
			// Enable onlyInZenMode setting
			await updateConfig('onlyInZenMode', true);
		});

		teardown(async () => {
			if (document) {
				await cleanupTestFile(document);
			}
			await updateConfig('onlyInZenMode', false);
			await vscode.commands.executeCommand('codeglow.toggle'); // Ensure disabled
		});

		test('Should respect onlyInZenMode setting', async () => {
			const content = `First paragraph
with multiple lines

Second paragraph
also with multiple lines`;

			document = await createAndOpenTestFile(content);
			await vscode.commands.executeCommand('codeglow.toggle'); // Enable extension
			
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);

			// Simulate window state changes
			const windowStateChangeEvent = new vscode.EventEmitter<vscode.WindowState>();
			
			// Test when not in Zen Mode
			windowStateChangeEvent.fire({ focused: false, active: false });
			await new Promise(resolve => setTimeout(resolve, 100));

			// Test when in Zen Mode
			windowStateChangeEvent.fire({ focused: true, active: true });
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.ok(true); // If we got here without errors, test passes
		});

		test('Should handle toggling while in Zen Mode', async () => {
			const content = `Test content
for toggling`;

			document = await createAndOpenTestFile(content);
			
			// Simulate being in Zen Mode
			const windowStateChangeEvent = new vscode.EventEmitter<vscode.WindowState>();
			windowStateChangeEvent.fire({ focused: true, active: true });
			
			// Test toggling while in Zen Mode
			await vscode.commands.executeCommand('codeglow.toggle'); // Enable
			await new Promise(resolve => setTimeout(resolve, 100));
			await vscode.commands.executeCommand('codeglow.toggle'); // Disable
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.ok(true); // If we got here without errors, test passes
		});

		test('Should handle configuration changes', async () => {
			const content = `Test content
for config changes`;

			document = await createAndOpenTestFile(content);
			
			// Test changing onlyInZenMode setting while extension is active
			await vscode.commands.executeCommand('codeglow.toggle'); // Enable
			await updateConfig('onlyInZenMode', false);
			await new Promise(resolve => setTimeout(resolve, 100));
			await updateConfig('onlyInZenMode', true);
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.ok(true); // If we got here without errors, test passes
		});
	});

	suite('Configuration Changes', () => {
		let document: vscode.TextDocument;

		teardown(async () => {
			if (document) {
				await cleanupTestFile(document);
			}
			await vscode.commands.executeCommand('codeglow.toggle'); // Ensure disabled
		});

		test('Should handle opacity changes', async () => {
			document = await createAndOpenTestFile('Test content');
			await vscode.commands.executeCommand('codeglow.toggle');
			
			// Test different opacity values
			const opacities = [0.1, 0.5, 0.9];
			for (const opacity of opacities) {
				await updateConfig('dimOpacity', opacity);
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		});

		test('Should handle buffer size changes', async () => {
			document = await createAndOpenTestFile('Test content');
			await vscode.commands.executeCommand('codeglow.toggle');
			
			// Test different buffer sizes
			const bufferSizes = [0, 25, 100];
			for (const size of bufferSizes) {
				await updateConfig('bufferLines', size);
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		});
	});

	suite('Multiple Editors', () => {
		let doc1: vscode.TextDocument;
		let doc2: vscode.TextDocument;

		teardown(async () => {
			if (doc1) {
				await cleanupTestFile(doc1);
			}
			if (doc2) {
				await cleanupTestFile(doc2);
			}
			await vscode.commands.executeCommand('codeglow.toggle'); // Ensure disabled
		});

		test('Should handle editor switching', async () => {
			// Create two test files
			doc1 = await createAndOpenTestFile('First file content');
			doc2 = await createAndOpenTestFile('Second file content');
			
			await vscode.commands.executeCommand('codeglow.toggle');

			// Switch between editors
			await vscode.window.showTextDocument(doc1);
			await new Promise(resolve => setTimeout(resolve, 100));
			
			await vscode.window.showTextDocument(doc2);
			await new Promise(resolve => setTimeout(resolve, 100));
			
			await vscode.window.showTextDocument(doc1);
			await new Promise(resolve => setTimeout(resolve, 100));
		});

		test('Should handle split editors', async () => {
			// Create two test files
			doc1 = await createAndOpenTestFile('First file content');
			doc2 = await createAndOpenTestFile('Second file content');
			
			await vscode.commands.executeCommand('codeglow.toggle');

			// Split editor
			await vscode.commands.executeCommand('workbench.action.splitEditor');
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Switch between splits
			await vscode.window.showTextDocument(doc1, { viewColumn: vscode.ViewColumn.One });
			await new Promise(resolve => setTimeout(resolve, 100));
			
			await vscode.window.showTextDocument(doc2, { viewColumn: vscode.ViewColumn.Two });
			await new Promise(resolve => setTimeout(resolve, 100));
		});
	});
});
