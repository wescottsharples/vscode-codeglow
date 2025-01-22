# Limelight

Limelight is a VS Code extension inspired by [limelight.vim](https://github.com/junegunn/limelight.vim) that helps you focus on your active code by dimming inactive regions. Like its Vim counterpart, it's perfect for developers who want to concentrate on specific parts of their code while maintaining context awareness.

## Features

- **Smart Focus**: Automatically highlights your active code block while dimming surrounding code
- **Paragraph Mode**: By default, treats paragraphs (text between blank lines) as focus blocks, just like limelight.vim
- **Multiple Detection Modes**: Choose between paragraph-based or symbol-based block detection
- **Performance Optimized**: Only processes visible code, making it efficient even with large files
- **Configurable**: Customize the dimming level and other settings to match your preferences
- **Language Agnostic**: Works with any programming language
- **Keyboard Friendly**: Quick toggle command to enable/disable when needed

## Installation

1. Open VS Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS)
3. Type `ext install limelight.limelight`
4. Press Enter

## Usage

1. Open any code file
2. Move your cursor to a code block
3. The current block will stay at full opacity while surrounding code is dimmed
4. Toggle the effect with:
   - Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`): "Limelight: Toggle Effect"
   - Or set up your own keyboard shortcut

## Configuration

Limelight can be configured through VS Code's settings:

- `limelight.dimOpacity`: Opacity level for dimmed text (0.0 to 1.0)
  - Default: 0.3
  - Higher values = less dimming
  - Lower values = more dimming
  - Similar to limelight.vim's coefficient setting

- `limelight.blockDetection`: How Limelight determines the focused block
  - `"paragraph"`: Uses blank lines to determine blocks (default, like limelight.vim)
  - `"documentSymbols"`: Uses language-specific symbols (functions, classes, etc.)

- `limelight.paragraphMode`: Alternative to blockDetection
  - When enabled, treats paragraphs (text between blank lines) as blocks
  - Default: true (matching limelight.vim's behavior)

- `limelight.bufferLines`: Number of additional lines to process above/below visible area
  - Default: 50
  - Increase for smoother scrolling
  - Decrease if you notice performance issues

- `limelight.enableLogging`: Enable debug logging
  - Default: false
  - Useful for troubleshooting

## Performance Considerations

Limelight is designed to be lightweight and efficient:
- Only processes visible code (plus configurable buffer)
- Minimal CPU usage
- Low memory footprint
- Optimized for large files

## Known Issues

- Symbol detection depends on language server capabilities
- May need to adjust buffer size for optimal scrolling experience

## TODO

- [ ] Try tree-sitter for faster, more accurate parsing
- [ ] Test and optimize for more languages (Python, Markdown, etc.)
- [ ] Add smooth transitions between focus states
- [ ] Support multiple cursor focus regions
- [ ] Add live opacity adjustment commands
- [ ] Integrate with VS Code themes
- [ ] Support VS Code notebooks
- [ ] Add contribution guidelines
- [ ] Implement performance optimizations for large files

Want to help? Pick an item and open an issue to discuss your approach! We welcome all contributions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## Acknowledgements

This extension is heavily inspired by [limelight.vim](https://github.com/junegunn/limelight.vim) by Junegunn Choi. We aim to bring the same focused writing/coding experience to VS Code users.

## License

[MIT](LICENSE)

## Release Notes

### 0.0.1

- Initial release
- Basic dimming functionality
- Paragraph and symbol-based detection modes
- Configurable settings
- Performance optimizations
