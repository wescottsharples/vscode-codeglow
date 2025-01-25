# Change Log

## [1.2.0] - 2024-03-19

### Added
- New delimiter-based block detection mode
  - Define custom block boundaries using regular expressions
  - Supports different patterns for block start and end
  - Falls back to paragraph mode if no patterns are set
  - Perfect for files with special formatting or comment-based sections
- Added comprehensive test suite for delimiter-based block detection

### Changed
- Updated block detection configuration to support three modes: 'paragraph' (default), 'documentSymbols', and 'delimiters'
- Improved error handling for invalid regex patterns
- Updated documentation with examples for delimiter-based block detection

## [1.1.0] - 2024-03-18

### Added
- File type specific settings via `enabledLanguages` configuration
- Lazy loading: Extension now only activates for specified file types
- Support for many common languages and file types out of the box
- Support for VS Code webview panels and custom editors
- Performance monitoring capabilities
- New command: "CodeGlow: Dump Performance Metrics" for performance analysis
- Internal performance tracking for optimization

### Changed
- Improved performance by removing `*` activation event
- Extension now only loads when needed, reducing VS Code startup impact
- Better documentation of supported file types and language settings
- Improved activation events handling
- Added performance instrumentation to core functions

### Fixed
- Reduced unnecessary extension activation for unsupported file types

## [1.0.9] - 2024-01-23

### Added
- New `onlyInZenMode` setting to activate CodeGlow exclusively in VS Code's Zen Mode
- Added comprehensive test suite for Zen Mode integration

### Changed
- Improved window state handling for better Zen Mode detection
- Updated documentation with Zen Mode integration details

## [1.0.8] - 2024-01-23
### Changed
- Improved scroll detection to be more selective
- Added velocity-based scroll detection with configurable threshold
- Added consecutive fast scroll detection to prevent accidental triggers
- Adjusted default scroll sensitivity for better user experience

## [1.0.7] - 2024-01-23
### Added
- Smart scroll handling: temporarily removes dimming while scrolling
- Smooth opacity transitions for a more polished experience
### Changed
- Improved cursor visibility detection during scrolling
- Added configurable scroll debounce delay
- Added option to disable scroll handling

## [1.0.3] - 2024-01-22
### Added
- Selected text now remains at full opacity
- Improved handling of multi-line selections
- Better support for "Select All" (cmd+a/ctrl+a)

## [1.0.2] - 2024-01-22
### Fixed
- Handle empty documents gracefully
- Prevent error when all text is deleted from a file

## [1.0.1] - 2024-01-22
### Changed
- Updated VS Code engine requirement to support version 1.93.0 and above
- Improved compatibility with Cursor IDE

## [1.0.0] - 2024-01-22
### Added
- Initial stable release
- High-resolution icon (1024x1024px)
- Professional dark theme styling
- Smart focus detection with paragraph and symbol modes
- Configurable dimming settings
- Performance optimizations for large files

## [0.0.3] - 2024-01-22
### Changed
- Updated extension icon to high-resolution (1024x1024px)
- Updated gallery banner color to darker theme (#191719)

## [0.0.2] - 2024-01-22
### Changed
- Renamed extension from Limelight to CodeGlow
- Updated all configuration and command references

## [0.0.1] - 2024-01-22
### Added
- Initial preview release
- Basic dimming functionality
- Paragraph and symbol-based detection modes
- Configurable settings