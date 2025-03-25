// functions/rpcs.ts
import { getSupabaseClient } from "@/app/auth/supabase";

const supabase = getSupabaseClient();



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
export const fetchComments = async (blogId: string, userId?: string) => {
    try {
        const { data, error } = await supabase.rpc('get_blogs_comments', {
            b_blog_id: blogId,
            b_user_id: userId || null
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
export const fetchLatestBlogs = async (userId: string, lastSeen: string | null = null) => {
    try {



        console.log('Fetching latest blogs with timestamp:', lastSeen);

        const { data, error } = await supabase.rpc('get_latest_blogs', {
            b_latest_timestamp: lastSeen,
            b_user_id: userId
        });

        if (error) {
            console.error('Supabase RPC error:', error);
            throw error;
        }

        console.log('Latest blogs found:', data?.length || 0);
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


/**
 * Creates a new comment on a blog post or as a reply to an existing comment
 * @param userId - UUID of the user creating the comment
 * @param blogId - UUID of the blog post
 * @param content - Comment text content
 * @param parentId - Optional UUID of the parent comment if this is a reply
 * @returns Newly created comment ID or null if creation fails
 */
export const createComment = async (
    userId: string,
    blogId: string,
    content: string,
    parentId?: string | null
): Promise<string | null> => {
    try {
        const { data, error } = await supabase.rpc('create_blog_comment', {
            p_blog_id: blogId,
            p_user_id: userId,
            p_content: content,
            p_parent_id: parentId || null
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating comment:', error);
        return null;
    }
};

/**
 * Edits an existing blog post
 * @param blogId - UUID of the blog to edit
 * @param userId - UUID of the user attempting to edit
 * @param updates - Object containing the fields to update
 * @returns JSON response with success/failure and updated blog data
 */
export const editBlog = async (
    blogId: string,
    userId: string,
    updates: {
        title?: string;
        content?: string;
        imageUrl?: string;
        tags?: string;
    }
): Promise<any> => {
    try {
        const { data, error } = await supabase.rpc('edit_blog', {
            b_blog_id: blogId,
            b_user_id: userId,
            b_new_title: updates.title || null,
            b_new_content: updates.content || null,
            b_new_image_url: updates.imageUrl || null,
            b_new_tags: updates.tags || null
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error editing blog:', error);
        throw error;
    }
};

/**
 * Deletes a blog post
 * @param blogId - UUID of the blog to delete
 * @param userId - UUID of the user attempting to delete
 * @returns JSON response with success/failure and deleted blog data
 */
export const deleteBlog = async (
    blogId: string,
    userId: string
): Promise<any> => {
    try {
        const { data, error } = await supabase.rpc('delete_blog', {
            b_blog_id: blogId,
            b_user_id: userId
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error deleting blog:', error);
        throw error;
    }
};

/**
 * Edits an existing comment
 * @param commentId - UUID of the comment to edit
 * @param userId - UUID of the user attempting to edit
 * @param content - New content for the comment
 * @returns JSON response with success/failure and updated comment data
 */
export const editComment = async (
    commentId: string,
    userId: string,
    content: string
): Promise<any> => {
    try {
        const { data, error } = await supabase.rpc('edit_blog_comment', {
            b_comment_id: commentId,
            b_user_id: userId,
            b_new_content: content
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error editing comment:', error);
        throw error;
    }
};

/**
 * Deletes a comment and its replies
 * @param commentId - UUID of the comment to delete
 * @param userId - UUID of the user attempting to delete
 * @returns JSON response with success/failure and deleted comment data
 */
export const deleteCommentRecursive = async (
    commentId: string,
    userId: string
): Promise<any> => {
    try {
        const { data, error } = await supabase.rpc('delete_blog_comment', {
            b_comment_id: commentId,
            b_user_id: userId
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
    }
};