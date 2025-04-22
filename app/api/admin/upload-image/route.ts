import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseClient'; // Import Supabase client
// Removed fs and path imports
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames

const BUCKET_NAME = 'blog-images'; // Define bucket name, also used in "validate" endpoint

export async function POST(request: NextRequest) {
 

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Validate file type 
    if (!file.type.startsWith('image/')) {
       return NextResponse.json({ error: "Invalid file type, please upload an image." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate a unique filename
    const fileExtension = file.name.split('.').pop(); 
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;

    // Get Supabase client
    const supabase = getSupabaseServerClient();

    // Upload file to Supabase Storage
    // Prefix uploadData with _ as it's not used, only uploadError is checked
    const { data: _uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(uniqueFilename, buffer, {
        contentType: file.type, // Pass content type
        cacheControl: '3600', // Set cache control
        upsert: false, // Don't overwrite existing files 
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json({ error: "Failed to upload image to storage", details: uploadError.message }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uniqueFilename);

    if (!urlData || !urlData.publicUrl) {
        console.error('Supabase storage getPublicUrl error: URL not found for', uniqueFilename);
        // Attempt to delete the uploaded file if we can't get the URL? Or handle differently.
        // For now, return an error.
        return NextResponse.json({ error: "Image uploaded but failed to get public URL" }, { status: 500 });
    }

    const publicImageUrl = urlData.publicUrl;
    console.log(`Image uploaded successfully to Supabase: ${publicImageUrl}`); 

    return NextResponse.json({ success: true, imageUrl: publicImageUrl });

  } catch (error) {
    console.error('Image upload failed:', error);
    // Check if the error is an object and has a message property
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: "Image upload failed", details: errorMessage }, { status: 500 });
  }
}
