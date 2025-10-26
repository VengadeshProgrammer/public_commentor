// Supabase configuration
const SUPABASE_URL = 'https://cvqlhrrqlfddyxndcoag.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWxocnJxbGZkZHl4bmRjb2FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MTU2MzcsImV4cCI6MjA3NzA5MTYzN30.i1y6_RvqV-Qc4881f_sIit9rLp7-hfrzSm_T9n9ogUU';

// Initialize Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM elements
const commentForm = document.getElementById('commentForm');
const commentsList = document.getElementById('commentsList');
const submitBtn = document.getElementById('submitBtn');

// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Function to display a message
function showMessage(message, type = 'error') {
    // Remove existing messages
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    // Insert after the form
    commentForm.parentNode.insertBefore(messageDiv, commentForm.nextSibling);

    // Auto remove success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// Function to create comment card HTML
function createCommentCard(comment) {
    return `
        <div class="comment-card">
            <div class="comment-header">
                <span class="comment-author">${comment.name || 'Anonymous'}</span>
                <span class="comment-date">${formatDate(comment.created_at)}</span>
            </div>
            <div class="comment-text">${comment.comment}</div>
        </div>
    `;
}

// Function to load comments
async function loadComments() {
    try {
        commentsList.innerHTML = '<div class="loading">Loading comments...</div>';

        const { data: comments, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="loading">No comments yet. Be the first to comment!</div>';
            return;
        }

        commentsList.innerHTML = comments.map(comment => createCommentCard(comment)).join('');
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsList.innerHTML = '<div class="error">Failed to load comments. Please refresh the page.</div>';
    }
}

// Function to submit a comment
async function submitComment(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('name');
    const commentInput = document.getElementById('comment');
    
    const name = nameInput.value.trim() || 'Anonymous';
    const comment = commentInput.value.trim();

    if (!comment) {
        showMessage('Please enter a comment.');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        const { data, error } = await supabase
            .from('comments')
            .insert([
                {
                    name: name,
                    comment: comment
                }
            ]);

        if (error) {
            throw error;
        }

        // Clear form
        commentForm.reset();
        showMessage('Comment posted successfully!', 'success');
        
        // Reload comments
        await loadComments();
    } catch (error) {
        console.error('Error submitting comment:', error);
        showMessage('Failed to post comment. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Comment';
    }
}

// Function to set up real-time subscriptions
function setupRealtimeSubscription() {
    supabase
        .channel('public:comments')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'comments' 
            }, 
            (payload) => {
                // Prepend new comment to the list
                const newCommentHtml = createCommentCard(payload.new);
                const firstComment = commentsList.querySelector('.comment-card');
                
                if (firstComment) {
                    commentsList.insertAdjacentHTML('afterbegin', newCommentHtml);
                } else {
                    loadComments(); // Reload if no comments were present
                }
            }
        )
        .subscribe();
}

// Initialize the application
async function init() {
    // Load existing comments
    await loadComments();
    
    // Set up form submission
    commentForm.addEventListener('submit', submitComment);
    
    // Set up real-time updates
    setupRealtimeSubscription();
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
