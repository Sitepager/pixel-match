# @sitepager/pixel-match

A fast, accurate, and configurable pixel-level image comparison library for Node.js, written in TypeScript. This is a drop-in replacement for the original pixelmatch library, maintaining full API compatibility while adding new features and improvements.

## Installation

```bash
npm install @sitepager/pixel-match
```

## CLI Usage

The package includes a command-line interface for comparing images directly from your terminal.

### Basic Usage

```bash
npx @sitepager/pixel-match <image1> <image2> [options]
```

### Options

- `-o, --output <diff>`: Output diff PNG image path
- `-t, --threshold <number>`: Matching threshold (0-1)
- `--include-aa`: Detect and ignore anti-aliased pixels
- `--no-include-aa`: Do not ignore anti-aliased pixels
- `--horizontal-shift <pixels>`: Horizontal shift in pixels
- `--vertical-shift <pixels>`: Vertical shift in pixels
- `--alpha <number>`: Alpha value for diff mask (0-1)
- `--diff-mask`: Output only the diff mask
- `--help-options`: Show all pixelmatch options and exit

### Examples

Basic comparison with diff output:

```bash
npx @sitepager/pixel-match before.png after.png --output diff.png
```

With custom threshold:

```bash
npx @sitepager/pixel-match before.png after.png --output diff.png --threshold 0.05
```

With threshold and anti-aliasing detection:

```bash
npx @sitepager/pixel-match before.png after.png --output diff.png --threshold 0.05 --include-aa
```

With threshold, anti-aliasing, and pixel shift tolerance:

```bash
npx @sitepager/pixel-match before.png after.png --output diff.png --threshold 0.05 --include-aa --horizontal-shift 7 --vertical-shift 6
```

With diff mask and custom alpha:

```bash
npx @sitepager/pixel-match before.png after.png --output diff.png --diff-mask --alpha 0.5
```

### Output

The CLI will output:

- The time taken to perform the comparison
- The number of different pixels found
- The percentage of different pixels
- A diff image if an output path is specified

### Exit Codes

- `0`: Images match (no differences found)
- `1`: Failed to read image1
- `2`: Image dimensions do not match
- `3`: Error running pixelmatch
- `64`: Invalid usage (missing required arguments)
- `65`: Image dimensions do not match
- `66`: Images differ (differences found)

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

### Browser vs Node.js Usage

The library provides two different entry points for browser and Node.js environments:

#### Browser Usage

```typescript
import pixelmatch from '@sitepager/pixel-match/browser';

// Example with canvas elements
const canvas1 = document.getElementById('canvas1') as HTMLCanvasElement;
const canvas2 = document.getElementById('canvas2') as HTMLCanvasElement;
const outputCanvas = document.getElementById('output') as HTMLCanvasElement;

const ctx1 = canvas1.getContext('2d')!;
const ctx2 = canvas2.getContext('2d')!;
const outputCtx = outputCanvas.getContext('2d')!;

const img1 = ctx1.getImageData(0, 0, width, height);
const img2 = ctx2.getImageData(0, 0, width, height);
const output = outputCtx.createImageData(width, height);

const diff = pixelmatch(
  img1.data,
  img2.data,
  output.data,
  width,
  height,
  { threshold: 0.1 }
);

outputCtx.putImageData(output, 0, 0);
```

#### Node.js Usage

```typescript
import pixelmatch from '@sitepager/pixel-match/node';
import { readFileSync } from 'fs';
import { PNG } from 'pngjs';

// Read images
const img1 = PNG.sync.read(readFileSync('before.png'));
const img2 = PNG.sync.read(readFileSync('after.png'));
const { width, height } = img1;
const output = new PNG({ width, height });

// Compare images
const diff = await pixelmatch(
  img1.data,
  img2.data,
  output.data,
  width,
  height,
  { threshold: 0.1 }
);

// Save diff image
output.pack().pipe(createWriteStream('diff.png'));
```

### When to Use Each Pattern

1. **Browser Pattern** (`@sitepager/pixel-match/browser`):
   - Use when working with canvas elements in a web browser
   - Ideal for real-time image comparison in web applications
   - Works with `ImageData` objects from canvas contexts
   - Synchronous operation (no async/await needed)
   - Best for client-side visual diff tools or image processing applications

2. **Node.js Pattern** (`@sitepager/pixel-match/node`):
   - Use when working with image files on the server
   - Ideal for automated testing, CI/CD pipelines, or server-side image processing
   - Works with raw image data from file systems
   - Asynchronous operation (requires async/await)
   - Best for automated visual regression testing or server-side image processing

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
import { pixelmatch } from '@sitepager/pixel-match/browser';

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

### With Custom Anti-Aliased Pixel Color

```typescript
const options = {
    aaColor: [0, 255, 255], // Cyan for anti-aliased pixels
};

const diff = pixelmatch(img1, img2, output, width, height, options);
```

### With Alternative Diff Color for Darker Pixels

```typescript
const options = {
    diffColor: [255, 0, 0],      // Red for differences (default)
    diffColorAlt: [0, 0, 255],  // Blue when img2 is darker
};

const diff = pixelmatch(img1, img2, output, width, height, options);
```

### Full Example with All Options

```typescript
const options = {
    threshold: 0.07,                // Color difference threshold
    includeAA: true,                // Detect and ignore anti-aliasing
    alpha: 0.3,                     // Opacity of unchanged pixels in diff
    aaColor: [0, 255, 255],         // Cyan for anti-aliased pixels
    diffColor: [255, 0, 0],         // Red for differences
    diffColorAlt: [0, 0, 255],      // Blue for darker pixels in img2
    diffMask: true,                 // Output only the diff mask
    horizontalShiftPixels: 2,       // Allow 2px horizontal shift
    verticalShiftPixels: 2,         // Allow 2px vertical shift
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
    pixelmatch(img1, img2, null, width, height);
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
