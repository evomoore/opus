import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  const { paramsToSign } = await request.json();

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Create a signature using Cloudinary's requirements
  const paramsString = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&');

  const signature = crypto
    .createHash('sha1')
    .update(paramsString + apiSecret)
    .digest('hex');

  return NextResponse.json({ signature });
} 