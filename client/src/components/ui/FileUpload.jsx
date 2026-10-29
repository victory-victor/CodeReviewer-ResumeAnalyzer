import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle } from 'lucide-react';

const FileUpload = ({
  onUpload,
  accept,
  maxSize = 10 * 1024 * 1024,
  label = 'Upload a file',
  className = '',
}) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setUploadedFile(file);
      setUploading(true);

      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      try {
        if (onUpload) {
          await onUpload(file);
        }
        clearInterval(interval);
        setUploadProgress(100);
      } catch (error) {
        clearInterval(interval);
        setUploadProgress(0);
        setUploadedFile(null);
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const removeFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-300
            ${
              isDragActive
                ? 'border-primary-500 bg-primary-500/5'
                : 'border-dark-600 hover:border-primary-500/50 hover:bg-dark-800/50'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-white font-medium">{label}</p>
          <p className="text-sm text-gray-500 mt-1">
            {isDragActive
              ? 'Drop the file here...'
              : 'Drag & drop a file here, or click to select'}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Max size: {formatFileSize(maxSize)}
          </p>
        </div>
      ) : (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              {uploadProgress === 100 ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <File className="w-5 h-5 text-primary-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(uploadedFile.size)}
              </p>
            </div>
            <button
              onClick={removeFile}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {uploading && (
            <div className="mt-3">
              <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}% uploaded</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
