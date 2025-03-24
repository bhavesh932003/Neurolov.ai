// functions/rpcs.ts
import { getSupabaseClient } from "@/app/auth/supabase";

const supabase = getSupabaseClient();

/**
 * Gets the like count for a specific content
 * @param contentId - UUID of the content
 * @param contentType - Type of content (e.g., 'blog', 'comment')
 * @returns Number of likes
 */
export const getLikeCount = async (contentId: string, contentType: string): Promise<number> => {
    try {
        const { data, error } = await supabase.rpc('get_blogs_likes_count', {
            b_content_id: contentId,
            b_content_type: contentType
        });

        if (error) throw error;
        return data || 0;
    } catch (error) {
        console.error('Error getting like count:', error);
        return 0;
    }
};

/**
 * Toggles a like for a specific content
 * @param userId - UUID of the user
 * @param contentId - UUID of the content
 * @param contentType - Type of content (e.g., 'blog', 'comment')
 * @returns Boolean indicating if content is now liked (true) or unliked (false)
 */
export const toggleLike = async (userId: string, contentId: string, contentType: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc('toggle_blogs_likes', {
            b_user_id: userId,
            b_content_id: contentId,
            b_content_type: contentType
        });

        if (error) throw error;
        return !!data; // Convert to boolean
    } catch (error) {
        console.error('Error toggling like:', error);
        throw error;
    }
};

/**
 * Fetches comments for a blog post
 * @param blogId - UUID of the blog
 * @returns Array of comments with nested structure
 */
export const fetchComments = async (blogId: string) => {
    try {
        const { data, error } = await supabase.rpc('get_blogs_comments', {
            b_blog_id: blogId
        });

        if (error) throw error;

        // Convert the flat structure to a nested tree
        return buildCommentTree(data || []);
    } catch (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
};

/**
 * Helper function to build a nested comment tree from flat data
 * @param comments - Flat array of comments
 * @returns Nested comment structure
 */
const buildCommentTree = (comments: any[]) => {
    const commentMap: Record<string, any> = {};
    const rootComments: any[] = [];

    // Convert list into a map for easy lookup
    comments.forEach(comment => {
        commentMap[comment.id] = { ...comment, replies: [] };
    });

    // Build tree structure
    comments.forEach(comment => {
        if (comment.parent_id) {
            commentMap[comment.parent_id]?.replies.push(commentMap[comment.id]);
        } else {
            rootComments.push(commentMap[comment.id]);
        }
    });

    return rootComments;
};

/**
 * Fetches latest blogs after a specific timestamp, including like and comment counts, 
 * and whether the authenticated user has liked them.
 * @param userId - Authenticated user's ID (empty string if not logged in)
 * @param lastSeen - Timestamp indicating when the user last checked
 * @returns Array of latest blog posts with like count, comment count, and like status
 */
export const fetchLatestBlogs = async (userId: string, lastSeen: string | Date) => {
    try {
        const timestamp = typeof lastSeen === 'string' ? lastSeen : lastSeen.toISOString();

        const { data, error } = await supabase.rpc('get_latest_blogs', {
            b_latest_timestamp: timestamp,
            b_user_id: userId
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching latest blogs:', error);
        return [];
    }
};

/**
 * Fetches paginated blog posts with like and comment counts, and checks if the authenticated user has liked them.
 * @param userId - Authenticated user's ID (empty string if not logged in)
 * @param limit - Number of blogs to fetch (default: 10)
 * @param cursor - Timestamp for pagination (null for first page)
 * @returns Array of blog posts with like count, comment count, and like status
 */
export const fetchBlogs = async (userId: string = '', limit: number = 10, cursor: string | null = null) => {
    try {
        const { data, error } = await supabase.rpc('get_paginated_blogs', {
            b_limit: limit,
            b_last_timestamp: cursor,
            b_user_id: userId
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching blogs:', error);
        return [];
    }
};

/**
 * Creates a new blog post.
 * @param userId - UUID of the user
 * @param title - Title of the blog
 * @param content - Blog content
 * @param tags - Comma-separated tags as a string
 * @param imageUrl - Image URL
 * @returns Newly created blog ID
 */
export const createBlog = async (
    userId: string,
    title: string,
    content: string,
    imageUrl: string,
    tags: string
): Promise<string | null> => {
    try {
        const { data, error } = await supabase.rpc('create_new_blog', {
            b_content: content,
            b_image_url: imageUrl,
            b_tags: tags,
            b_title: title,
            b_user_id: userId
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating blog:', error);
        return null;
    }
};


