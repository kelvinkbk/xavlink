# Next Steps: Configure Cloudinary on Render

Your code has been pushed and Render will automatically redeploy. However, the deployment will fail without Cloudinary credentials. Follow these steps:

## 1. Get Your Cloudinary Credentials

1. Go to [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
2. Create a free account (or sign in if you already have one)
3. From the Dashboard, copy these three values:
   - **Cloud Name**
   - **API Key**
   - **API Secret** (click "Reveal" to see it)

## 2. Add Environment Variables to Render

1. Go to [https://dashboard.render.com/](https://dashboard.render.com/)
2. Click on your **xavlink-backend** service
3. Click the **"Environment"** tab in the left sidebar
4. Click **"Add Environment Variable"** and add these three:

   **Variable 1:**

   - Key: `CLOUDINARY_CLOUD_NAME`
   - Value: (paste your Cloud Name)

   **Variable 2:**

   - Key: `CLOUDINARY_API_KEY`
   - Value: (paste your API Key)

   **Variable 3:**

   - Key: `CLOUDINARY_API_SECRET`
   - Value: (paste your API Secret)

5. Click **"Save Changes"** - this will automatically trigger a redeploy

## 3. Wait for Deployment

- The deployment will take 2-5 minutes
- You can monitor progress in the "Logs" tab
- Look for "Build successful" and "Server running on port..."

## 4. Test the Upload

Once deployed, test by:

1. Uploading a profile picture
2. Creating a post with an image
3. Sending an image in chat

All files will now be stored permanently in Cloudinary! 🎉

## Benefits You'll Get

✅ **Persistent Storage** - Files survive server restarts  
✅ **Fast CDN** - Global delivery via Cloudinary's CDN  
✅ **Free Tier** - 25 GB storage + 25 GB bandwidth/month  
✅ **Auto Optimization** - Images are automatically optimized

## Troubleshooting

If you see errors after deployment:

- Check the Render logs for "Cloudinary" errors
- Verify all 3 environment variables are set correctly (no typos)
- Make sure there are no extra spaces in the values
