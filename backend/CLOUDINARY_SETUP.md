# Cloudinary Setup Guide

This application uses Cloudinary for persistent file storage in production. Follow these steps to configure Cloudinary:

## 1. Create a Cloudinary Account

1. Go to [https://cloudinary.com/](https://cloudinary.com/)
2. Sign up for a free account
3. After signing in, you'll be redirected to the Dashboard

## 2. Get Your Cloudinary Credentials

From your Cloudinary Dashboard, you'll find:

- **Cloud Name**: Found at the top of the dashboard
- **API Key**: Found in the "Account Details" section
- **API Secret**: Click "Reveal" next to API Key to see it

## 3. Configure Environment Variables

Add these to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### For Local Development:

Update `backend/.env`

### For Production (Render):

1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add the three environment variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Save changes (this will trigger a redeploy)

## 4. File Organization

Files are automatically organized in Cloudinary folders:

- **Profile Pictures**: `xavlink/profile/`
- **Post Images**: `xavlink/posts/`
- **Chat Attachments**: `xavlink/chats/`

## 5. Features

- ✅ **Persistent Storage**: Files persist across deployments
- ✅ **CDN**: Fast global delivery
- ✅ **Image Optimization**: Automatic transformation and optimization
- ✅ **Free Tier**: 25 GB storage, 25 GB bandwidth/month

## 6. File Limits

- Profile & Post Images: 5 MB max
- Chat Attachments: 10 MB max

## Supported File Types

### Images

- `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.heic`, `.heif`

### Chat Attachments (also includes)

- Documents: `.pdf`, `.doc`, `.docx`, `.txt`, `.xls`, `.xlsx`, `.ppt`, `.pptx`
- Media: `.mp3`, `.wav`, `.mp4`, `.mov`, `.avi`

## Migration Notes

Old files stored in `/uploads` directory will not be accessible after moving to Cloudinary. Users will need to re-upload their profile pictures and any content with images.
