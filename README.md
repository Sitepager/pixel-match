# @sitepager/pixel-match

A fast, accurate, and configurable pixel-level image comparison library for Node.js, written in TypeScript. This is a drop-in replacement for the original pixelmatch library, maintaining full API compatibility while adding new features and improvements.

## Installation

```bash
npm install @sitepager/pixel-match
```

## API

```typescript
import pixelmatch from '@sitepager/pixel-match';

const diff = pixelmatch(
  img1: Uint8Array | Uint8ClampedArray,
  img2: Uint8Array | Uint8ClampedArray,
  output: Uint8Array | Uint8ClampedArray | null,
  width: number,
  height: number,
  options?: PixelmatchOptions
): number
```

### Parameters

- `img1`: First image data as a Uint8Array or Uint8ClampedArray in RGBA format
- `img2`: Second image data as a Uint8Array or Uint8ClampedArray in RGBA format
- `output`: Optional output image data to write the diff to. If null, only the difference count is returned
- `width`: Width of the images in pixels
- `height`: Height of the images in pixels
- `options`: Configuration options for the comparison (see below)

### Returns

The number of different pixels found between the images.

## Options

```typescript
interface PixelmatchOptions {
    threshold?: number; // Color difference threshold (0 to 1). Default: 0.1
    includeAA?: boolean; // Whether to detect and ignore anti-aliasing. Default: false
    alpha?: number; // Opacity of unchanged pixels in the diff output. Default: 0.1
    aaColor?: [number, number, number]; // Color of anti-aliased pixels in the diff output [r, g, b]. Default: [255, 255, 0] (yellow)
    diffColor?: [number, number, number]; // Color of different pixels in the diff output [r, g, b]. Default: [255, 0, 0] (red)
    diffColorAlt?: [number, number, number]; // Alternative color for different pixels when img2 is darker [r, g, b]
    diffMask?: boolean; // Whether to draw the diff over a transparent background (true) or over the original image (false)
    horizontalShiftPixels?: number; // Number of pixels to check horizontally for similar pixels. Default: 0
    verticalShiftPixels?: number; // Number of pixels to check vertically for similar pixels. Default: 0
}
```

### Default Values

When no options are provided, the following defaults are used:

```typescript
const defaultOptions = {
    threshold: 0.1, // 10% color difference threshold
    includeAA: false, // Don't detect anti-aliasing
    alpha: 0.1, // 10% opacity for unchanged pixels
    aaColor: [255, 255, 0], // Yellow for anti-aliased pixels
    diffColor: [255, 0, 0], // Red for different pixels
    diffColorAlt: undefined, // No alternative color
    diffMask: false, // Draw diff over original image
    horizontalShiftPixels: 0, // No horizontal shift
    verticalShiftPixels: 0, // No vertical shift
};
```

## Usage Examples

### Basic Comparison

```typescript
import pixelmatch from '@sitepager/pixel-match';

const diff = pixelmatch(img1, img2, output, width, height);
```

### With Custom Options

```typescript
const options = {
    threshold: 0.05, // More strict comparison
    includeAA: true, // Include anti-aliasing in comparison
    alpha: 0.5, // More visible unchanged pixels
    diffColor: [255, 0, 255], // Purple diff color
    diffMask: true, // Transparent background
};

const diff = pixelmatch(img1, img2, output, width, height, options);
```

### Handling Image Shifts

```typescript
const options = {
    horizontalShiftPixels: 7, // Allow 7px horizontal shift
    verticalShiftPixels: 6, // Allow 6px vertical shift
    threshold: 0.1,
};

const diff = pixelmatch(img1, img2, output, width, height, options);
```

> ⚠️ **Beta Feature Warning**: The `horizontalShiftPixels` and `verticalShiftPixels` options are currently in beta. These features can significantly impact performance as they require additional pixel comparisons. Use with caution in production environments. We are actively working on performance optimizations for these features in an upcoming release.

## Error Cases

The library will throw errors in the following cases:

1. **Invalid Image Data Format**

    ```typescript
    // Error: "Image data: Uint8Array, Uint8ClampedArray or Buffer expected"
    pixelmatch(regularArray, img2, null, width, height);
    ```

2. **Mismatched Image Sizes**

    ```typescript
    // Error: "Image sizes do not match"
    pixelmatch(img1, img2, null, width1, height1);
    ```

3. **Invalid Dimensions**
    ```typescript
    // Error: "Image data size does not match width/height"
    pixelmatch(img1, img2, null, width, height); // where width * height * 4 !== img1.length
    ```

## Best Practices

1. **Image Format**: Always ensure your images are in RGBA format (4 bytes per pixel)
2. **Threshold Selection**:
    - Use lower thresholds (0.05-0.1) for precise comparisons
    - Use higher thresholds (0.2-0.3) for more lenient comparisons
3. **Anti-aliasing**: Set `includeAA: true` when comparing screenshots with text or UI elements
4. **Image Shifts**:
    - ⚠️ Use `horizontalShiftPixels` and `verticalShiftPixels` with caution as they are in beta
    - Consider using these features only in development/testing environments
    - For production use, consider preprocessing images to align them before comparison

## Development

- `npm run build` — Build the package with tsup
- `npm test` — Run tests with vitest
- `npm run format` — Format code with Prettier
- `npm run changeset` — Manage versioning and changelogs

## Contributing

Contributions are welcome! Please open issues or pull requests.

## License

MIT
