# CodeGlow for VS Code

<div align="center">

[![CodeGlow Demo](screen.gif)](https://marketplace.visualstudio.com/items?itemName=wescottsharples.codeglow)

<a href="https://marketplace.visualstudio.com/items?itemName=wescottsharples.codeglow">
  <img src="icon.png" width="128" height="128" alt="CodeGlow Icon">
</a>

[![Version](https://img.shields.io/visual-studio-marketplace/v/wescottsharples.codeglow)](https://marketplace.visualstudio.com/items?itemName=wescottsharples.codeglow)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/wescottsharples.codeglow)](https://marketplace.visualstudio.com/items?itemName=wescottsharples.codeglow)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/wescottsharples.codeglow)](https://marketplace.visualstudio.com/items?itemName=wescottsharples.codeglow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Illuminate your focus, dim the distractions.**

</div>

## Features

CodeGlow helps you focus on what matters by intelligently dimming inactive regions of your code. Like a spotlight on your active code block, it keeps you in the zone while maintaining context awareness.

### Smart Focus Detection

- **Paragraph Mode**: Automatically detects and highlights text blocks between blank lines
- **Symbol Mode**: Uses VS Code's language server to focus on semantic blocks (functions, classes, etc.)
- **Smooth Transitions**: Seamlessly updates as you move through your code
- **Smart Scroll Handling**: Temporarily removes dimming while scrolling for better readability

### Customizable Experience

- **Adjustable Dimming**: Fine-tune the opacity of inactive regions (0.0 to 1.0)
- **Buffer Control**: Set how many lines to process above and below the visible area
- **Multiple Detection Modes**: Choose between paragraph-based or symbol-based detection
- **Scroll Behavior**: Configure how the extension handles scrolling and transitions
- **Performance Optimized**: Only processes visible code, making it efficient even with large files

## Installation

1. Open VS Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS)
3. Type `ext install wescottsharples.codeglow`
4. Press Enter

## Usage

1. Open any code file
2. Move your cursor to a code block
3. The current block stays at full opacity while surrounding code is dimmed
4. Toggle the effect with:
   - Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`): "CodeGlow: Toggle Effect"
   - Or set up your own keyboard shortcut

## Configuration

CodeGlow can be customized through VS Code's settings:

\`\`\`jsonc
{
  // Opacity level for dimmed text (0.0 to 1.0)
  "codeglow.dimOpacity": 0.3,

  // Use paragraph mode (text between blank lines)
  "codeglow.paragraphMode": true,

  // Choose focus detection method
  "codeglow.blockDetection": "paragraph", // or "documentSymbols"

  // Number of buffer lines to process
  "codeglow.bufferLines": 50,

  // Enable/disable dimming removal while scrolling
  "codeglow.disableWhileScrolling": true,

  // Delay before reapplying dimming after scrolling (ms)
  "codeglow.scrollDebounceDelay": 250,

  // Enable debug logging
  "codeglow.enableLogging": false
}
\`\`\`

## Performance

CodeGlow is designed to be lightweight and efficient:
- Only processes visible code
- Minimal CPU usage
- Low memory footprint
- Optimized for large files
- Smart scroll handling to maintain performance

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:
1. Open an issue first to discuss what you would like to change
2. Make sure to update tests as appropriate
3. Follow the existing code style

## License

[MIT](LICENSE) © Wescott Sharples

## Acknowledgements

Inspired by [Limelight.vim](https://github.com/junegunn/limelight.vim) by Junegunn Choi. We aim to bring the same focused coding experience to VS Code users.

## Release Notes

### 0.0.1

- Initial release
- Basic dimming functionality
- Paragraph and symbol-based detection modes
- Configurable settings
- Performance optimizations
