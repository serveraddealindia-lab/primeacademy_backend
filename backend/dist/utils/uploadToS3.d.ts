interface UploadToS3Options {
    filePath: string;
    originalName: string;
    folder?: string;
}
/**
 * Upload a file to AWS S3
 * @param options Upload options
 * @returns Promise with S3 file URL
 */
export declare const uploadToS3: (options: UploadToS3Options) => Promise<string>;
/**
 * Upload multiple files to S3
 * @param files Array of file paths and names
 * @returns Promise with array of S3 URLs
 */
export declare const uploadMultipleToS3: (files: Array<{
    filePath: string;
    originalName: string;
    folder?: string;
}>) => Promise<string[]>;
/**
 * Delete local file after S3 upload (optional cleanup)
 */
export declare const deleteLocalFile: (filePath: string) => void;
export {};
//# sourceMappingURL=uploadToS3.d.ts.map