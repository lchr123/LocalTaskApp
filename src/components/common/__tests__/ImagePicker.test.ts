/**
 * Unit Tests for ImagePicker Component
 *
 * Tests validation logic, error messages, and core behavior.
 *
 * Validates:
 * - Requirement 7.3: JPEG/PNG format, max 10MB for chat images
 * - Requirement 7.7: Block send and show restriction message for oversized/wrong format
 * - Requirement 9.4: Max 5 screenshots, each ≤5MB, JPG/PNG for reports
 * - Requirement 9.6: Reject file upload and show error for size/format violations
 */

import {
  validateImageFormat,
  validateImageSize,
  getFormatErrorMessage,
  getSizeErrorMessage,
  getMaxImagesErrorMessage,
  inferMimeType,
  validateImage,
  BYTES_PER_MB,
} from '../imagePickerUtils';

describe('ImagePicker - Validation Helpers', () => {
  describe('validateImageFormat', () => {
    const allowedFormats = ['image/jpeg', 'image/png'];

    it('accepts JPEG format (Req 7.3, 9.4)', () => {
      expect(validateImageFormat('image/jpeg', allowedFormats)).toBe(true);
    });

    it('accepts PNG format (Req 7.3, 9.4)', () => {
      expect(validateImageFormat('image/png', allowedFormats)).toBe(true);
    });

    it('rejects GIF format (Req 7.7, 9.6)', () => {
      expect(validateImageFormat('image/gif', allowedFormats)).toBe(false);
    });

    it('rejects WebP format (Req 7.7, 9.6)', () => {
      expect(validateImageFormat('image/webp', allowedFormats)).toBe(false);
    });

    it('rejects BMP format', () => {
      expect(validateImageFormat('image/bmp', allowedFormats)).toBe(false);
    });

    it('rejects unknown/empty MIME type', () => {
      expect(validateImageFormat('', allowedFormats)).toBe(false);
      expect(validateImageFormat('image/unknown', allowedFormats)).toBe(false);
    });

    it('is case-sensitive for MIME types', () => {
      expect(validateImageFormat('image/JPEG', allowedFormats)).toBe(false);
      expect(validateImageFormat('IMAGE/PNG', allowedFormats)).toBe(false);
    });
  });

  describe('validateImageSize', () => {
    describe('Chat context - 10MB limit (Req 7.3)', () => {
      const maxSizeMB = 10;

      it('accepts image exactly at 10MB limit', () => {
        expect(validateImageSize(10 * BYTES_PER_MB, maxSizeMB)).toBe(true);
      });

      it('accepts image under 10MB', () => {
        expect(validateImageSize(5 * BYTES_PER_MB, maxSizeMB)).toBe(true);
      });

      it('rejects image over 10MB (Req 7.7)', () => {
        expect(validateImageSize(10 * BYTES_PER_MB + 1, maxSizeMB)).toBe(false);
      });

      it('accepts very small image (1KB)', () => {
        expect(validateImageSize(1024, maxSizeMB)).toBe(true);
      });

      it('accepts zero-size image', () => {
        expect(validateImageSize(0, maxSizeMB)).toBe(true);
      });
    });

    describe('Report context - 5MB limit (Req 9.4)', () => {
      const maxSizeMB = 5;

      it('accepts image exactly at 5MB limit', () => {
        expect(validateImageSize(5 * BYTES_PER_MB, maxSizeMB)).toBe(true);
      });

      it('accepts image under 5MB', () => {
        expect(validateImageSize(3 * BYTES_PER_MB, maxSizeMB)).toBe(true);
      });

      it('rejects image over 5MB (Req 9.6)', () => {
        expect(validateImageSize(5 * BYTES_PER_MB + 1, maxSizeMB)).toBe(false);
      });

      it('rejects 10MB image in report context', () => {
        expect(validateImageSize(10 * BYTES_PER_MB, maxSizeMB)).toBe(false);
      });
    });
  });

  describe('Error Messages', () => {
    describe('getFormatErrorMessage (Req 7.7, 9.6)', () => {
      it('includes the rejected MIME type', () => {
        const message = getFormatErrorMessage('image/gif');
        expect(message).toContain('image/gif');
      });

      it('mentions supported formats', () => {
        const message = getFormatErrorMessage('image/webp');
        expect(message).toContain('JPEG');
        expect(message).toContain('PNG');
      });

      it('indicates format is not supported', () => {
        const message = getFormatErrorMessage('image/bmp');
        expect(message).toContain('不支持');
      });
    });

    describe('getSizeErrorMessage (Req 7.7, 9.6)', () => {
      it('includes the actual file size in MB', () => {
        const fileSize = 12 * BYTES_PER_MB;
        const message = getSizeErrorMessage(fileSize, 10);
        expect(message).toContain('12.00');
      });

      it('includes the maximum allowed size', () => {
        const fileSize = 6 * BYTES_PER_MB;
        const message = getSizeErrorMessage(fileSize, 5);
        expect(message).toContain('5');
      });

      it('indicates size exceeds limit', () => {
        const fileSize = 11 * BYTES_PER_MB;
        const message = getSizeErrorMessage(fileSize, 10);
        expect(message).toContain('超过');
      });

      it('formats fractional MB correctly', () => {
        const fileSize = 5.5 * BYTES_PER_MB;
        const message = getSizeErrorMessage(fileSize, 5);
        expect(message).toContain('5.50');
      });
    });

    describe('getMaxImagesErrorMessage (Req 9.4)', () => {
      it('includes the maximum count for reports (5)', () => {
        const message = getMaxImagesErrorMessage(5);
        expect(message).toContain('5');
      });

      it('includes the maximum count for chat (1)', () => {
        const message = getMaxImagesErrorMessage(1);
        expect(message).toContain('1');
      });

      it('indicates maximum limit', () => {
        const message = getMaxImagesErrorMessage(5);
        expect(message).toContain('最多');
      });
    });
  });
});


describe('ImagePicker - inferMimeType', () => {
  it('infers JPEG from .jpg extension', () => {
    expect(inferMimeType('file:///photos/image.jpg')).toBe('image/jpeg');
  });

  it('infers JPEG from .jpeg extension', () => {
    expect(inferMimeType('file:///photos/image.jpeg')).toBe('image/jpeg');
  });

  it('infers PNG from .png extension', () => {
    expect(inferMimeType('file:///photos/image.png')).toBe('image/png');
  });

  it('returns unknown for unsupported extensions', () => {
    expect(inferMimeType('file:///photos/image.gif')).toBe('image/unknown');
    expect(inferMimeType('file:///photos/image.bmp')).toBe('image/unknown');
  });

  it('handles uppercase extensions via toLowerCase', () => {
    expect(inferMimeType('file:///photos/image.JPG')).toBe('image/jpeg');
    expect(inferMimeType('file:///photos/image.PNG')).toBe('image/png');
  });

  it('handles URIs without extension', () => {
    expect(inferMimeType('file:///photos/image')).toBe('image/unknown');
  });
});

describe('ImagePicker - validateImage (combined validation)', () => {
  const allowedFormats = ['image/jpeg', 'image/png'];

  it('returns null for valid JPEG under size limit', () => {
    const result = validateImage('image/jpeg', 5 * BYTES_PER_MB, 10, allowedFormats);
    expect(result).toBeNull();
  });

  it('returns null for valid PNG at exact size limit', () => {
    const result = validateImage('image/png', 5 * BYTES_PER_MB, 5, allowedFormats);
    expect(result).toBeNull();
  });

  it('returns format error for invalid MIME type', () => {
    const result = validateImage('image/gif', 1 * BYTES_PER_MB, 10, allowedFormats);
    expect(result).not.toBeNull();
    expect(result).toContain('不支持');
    expect(result).toContain('image/gif');
  });

  it('returns size error for oversized image with valid format', () => {
    const result = validateImage('image/jpeg', 11 * BYTES_PER_MB, 10, allowedFormats);
    expect(result).not.toBeNull();
    expect(result).toContain('超过');
  });

  it('checks format before size (format error takes priority)', () => {
    const result = validateImage('image/gif', 20 * BYTES_PER_MB, 10, allowedFormats);
    expect(result).toContain('不支持');
    // Should be format error, not size error
    expect(result).not.toContain('超过');
  });
});
