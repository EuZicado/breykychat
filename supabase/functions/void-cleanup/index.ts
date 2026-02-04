import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting void cleanup...");

    // Get expired content
    const { data: expiredContent, error: fetchError } = await supabase
      .from("ephemeral_content")
      .select("id, content_url, creator_id")
      .lt("expires_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching expired content:", fetchError);
      throw fetchError;
    }

    if (!expiredContent || expiredContent.length === 0) {
      console.log("No expired content found");
      return new Response(
        JSON.stringify({ message: "No expired content to clean up", deleted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${expiredContent.length} expired items to delete`);

    let deletedFiles = 0;
    let deletedRows = 0;

    // Delete files from storage
    for (const item of expiredContent) {
      if (item.content_url) {
        // Extract file path from URL
        const urlParts = item.content_url.split("/storage/v1/object/public/void/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          const { error: storageError } = await supabase.storage
            .from("void")
            .remove([filePath]);

          if (storageError) {
            console.error(`Error deleting file ${filePath}:`, storageError);
          } else {
            deletedFiles++;
            console.log(`Deleted file: ${filePath}`);
          }
        }
      }
    }

    // Delete rows from database
    const expiredIds = expiredContent.map((item) => item.id);
    const { error: deleteError, count } = await supabase
      .from("ephemeral_content")
      .delete()
      .in("id", expiredIds);

    if (deleteError) {
      console.error("Error deleting expired rows:", deleteError);
      throw deleteError;
    }

    deletedRows = count || expiredIds.length;
    console.log(`Deleted ${deletedRows} rows from database`);

    return new Response(
      JSON.stringify({
        message: "Void cleanup completed",
        deletedFiles,
        deletedRows,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Void cleanup error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
