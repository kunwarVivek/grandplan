// ============================================
// FILE TYPE VALUE OBJECT
// Encapsulates upload type with validation rules
// ============================================

export type UploadType = "avatar" | "logo" | "favicon";

interface FileTypeConfig {
	maxSizeBytes: number;
	allowedMimeTypes: string[];
	allowedExtensions: string[];
}

const FILE_TYPE_CONFIGS: Record<UploadType, FileTypeConfig> = {
	avatar: {
		maxSizeBytes: 2 * 1024 * 1024, // 2MB
		allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
		allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
	},
	logo: {
		maxSizeBytes: 5 * 1024 * 1024, // 5MB
		allowedMimeTypes: [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/svg+xml",
		],
		allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
	},
	favicon: {
		maxSizeBytes: 5 * 1024 * 1024, // 5MB
		allowedMimeTypes: [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/svg+xml",
			"image/x-icon",
			"image/vnd.microsoft.icon",
		],
		allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico"],
	},
};

export class FileTypeVO {
	private constructor(
		public readonly type: UploadType,
		public readonly config: FileTypeConfig,
	) {}

	static create(type: string): FileTypeVO {
		if (!FileTypeVO.isValidType(type)) {
			throw new Error(
				`Invalid upload type: ${type}. Must be one of: avatar, logo, favicon`,
			);
		}
		return new FileTypeVO(type as UploadType, FILE_TYPE_CONFIGS[type as UploadType]);
	}

	static isValidType(type: string): type is UploadType {
		return type === "avatar" || type === "logo" || type === "favicon";
	}

	get maxSizeBytes(): number {
		return this.config.maxSizeBytes;
	}

	get maxSizeMB(): number {
		return this.config.maxSizeBytes / (1024 * 1024);
	}

	get allowedMimeTypes(): string[] {
		return this.config.allowedMimeTypes;
	}

	get allowedExtensions(): string[] {
		return this.config.allowedExtensions;
	}

	isAllowedMimeType(mimeType: string): boolean {
		return this.config.allowedMimeTypes.includes(mimeType);
	}

	isAllowedExtension(extension: string): boolean {
		const ext = extension.toLowerCase().startsWith(".")
			? extension.toLowerCase()
			: `.${extension.toLowerCase()}`;
		return this.config.allowedExtensions.includes(ext);
	}

	isWithinSizeLimit(sizeBytes: number): boolean {
		return sizeBytes <= this.config.maxSizeBytes;
	}
}
