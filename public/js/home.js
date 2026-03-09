// 1. Fix the selectors (Make sure these IDs exist in your HTML)
const errorMessageElement = document.getElementById("error-message-p"); // Change ID to match your HTML
const successMessageElement = document.getElementById("success-message-p"); // Change ID to match your HTML

// Existing Image Logic
const imageInput = document.getElementById("image");
const previewImg = document.getElementById("show-image-previw");
const previewWrapper = document.getElementById("preview-wrapper");
const removeBtn = document.getElementById("remove-img-btn");

imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        // Use URL.createObjectURL directly
        previewImg.src = URL.createObjectURL(file);
        previewWrapper.style.display = "block";
    }
});

removeBtn.addEventListener("click", () => {
    imageInput.value = ""; 
    previewWrapper.style.display = "none";
    previewImg.src = "";
});

const postContainer = document.getElementById("posts-container");

// 2. Updated showMessage function
const statusMessage = document.getElementById("status-message");

function showMessage(message, color) {
    if (!statusMessage) return; // Safety check

    // 1. Set the content and color
    statusMessage.textContent = message;
    statusMessage.style.backgroundColor = color; // Use as background for better visibility
    statusMessage.style.display = "block";

    // 2. Add a simple fade-in effect (optional)
    statusMessage.style.opacity = "1";

    // 3. Auto-hide after 3 seconds
    setTimeout(() => {
        statusMessage.style.display = "none";
    }, 3000);
}

async function getAllPosts() {
    try {
        const res = await fetch("/api/v1/posts");
        if (!res.ok) throw new Error("Could not fetch posts");
        
        const posts = await res.json();
        postContainer.innerHTML = '';

        // 3. Use for...of to handle async/await properly
        for (const post of posts.data) {
            const commentData = await getPostComments(post._id);
            const comments = commentData.comments || [];

            // Create post element
            const postWrapper = document.createElement("div");
            postWrapper.className = "post-wrapper";

            postWrapper.innerHTML = `
                ${post.text ? `<h3>${post.text}</h3>` : ""}
                ${post.image ? `<img src="${post.image}" alt="Post content" />` : ""}

                <div class="like-comment-wrapper">
                    <img class="like-btn" src="/images/home/like.png" alt="Like">
                    <img class="comment-btn" src="/images/home/comment.png" alt="Comment">
                </div>

                <div class="all-comments-container">
                    <div class="comments-close-container">
                        <ul class="comments-list">
                            ${comments.map(c => {
                               return `<li class="comment-container">
                                    <div>
                                        ${c.user.image 
                                            ? `<img class="profile-image" src="${c.user.image}" id="avatar-preview" class="profile-img">` 
                                            : `<div class="profile-image">${c.user.username[0].toUpperCase()}</div>`
                                        }
                                    </div>
                                    <div>
                                        <p class="comment-content">${c.text}</p>
                                    </div>
                                </li>`
                            }).join('')}
                        </ul>
                        <div class="close-comment-window"><img src="images/home/close.png" /></div>
                    </div>

                    <form class="create-comment-form">
                        <textarea name="text" placeholder="Write a comment..." rows="1"></textarea>
                        <input type="hidden" name="postId" value="${post._id}" />
                        <button type="submit"><img src="/images/home/send.png" alt="Send"></button>
                    </form>
                </div>
            `;

            postContainer.appendChild(postWrapper);

            // if key event is Enter submit comment form
            const textarea = postWrapper.querySelector("textarea");
            textarea.addEventListener("keydown", (event) => {
                // Check if Enter was pressed WITHOUT the Shift key
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    commentForm.requestSubmit(); 
                }
            });

            // 4. Scope listener to THIS specific form
            const commentForm = postWrapper.querySelector(".create-comment-form");
            commentForm.addEventListener("submit", async (event) => {
                event.preventDefault();
                const formData = new FormData(commentForm);
                const data = Object.fromEntries(formData);

                if (!data.text.trim()) {
                    showMessage("Please enter a comment!", "#ff4444");
                    return;
                }

                try {
                    const res = await fetch("/add-comment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data),
                        credentials: "include",
                    });

                    if (!res.ok) throw new Error("Failed to add comment");

                    commentForm.reset();
                    showMessage("Comment added successfully", "green");
                    
                    // Optional: Update the UI immediately
                    const ul = postWrapper.querySelector(".comments-list");

                    // 1. Re-fetch the comments from the server
                    const updatedCommentData = await getPostComments(post._id);
                    const comments = updatedCommentData.comments || [];

                    // 2. Get the very last comment (the one you just posted)
                    const lastComment = comments[comments.length - 1];

                    // 3. Build the HTML using that last comment
                    const newCommentHTML = `
                        <li class="comment-container">
                            <div>
                                ${lastComment.user.image 
                                    ? `<img class="profile-image" src="${lastComment.user.image}" class="profile-img">` 
                                    : `<div class="profile-image">${lastComment.user.username[0].toUpperCase()}</div>`
                                }
                            </div>
                            <div>
                                <p class="comment-content">${lastComment.text}</p>
                            </div>
                        </li>`;
                   ul.insertAdjacentHTML('beforeend', newCommentHTML);

                } catch (err) {
                    showMessage(err.message, "red");
                }
            });
            

            // main post"s comment container
            const commentMainContainer = postWrapper.querySelector(".all-comments-container");

            // open all comments window
            const openCommentWindow = postWrapper.querySelector(".comment-btn");
            openCommentWindow.addEventListener("click", ()=>{
                commentMainContainer.style.display="flex";
                commentMainContainer.scrollTop = commentMainContainer.scrollHeight;
            });

            // close all comments window
            const closeCommentWindow = postWrapper.querySelector(".close-comment-window");
            closeCommentWindow.addEventListener("click", ()=>{
                commentMainContainer.style.display = "none"
            });

            // if opened comment window and wi click other or scroll, close comment window
            window.addEventListener("pointerdown", (event) => {
                const allWindows = document.querySelectorAll(".all-comments-container");
                
                allWindows.forEach(container => {
                        // 1. Get the REAL display value, even if it's in a CSS file
                        const currentDisplay = window.getComputedStyle(container).display;
                        
                        const postWrapper = container.closest(".post-wrapper");
                        const openBtn = postWrapper?.querySelector(".comment-btn");

                        // 2. Check if it's visible and if the click was outside
                        if (currentDisplay !== "none" && 
                            !container.contains(event.target) && 
                            (openBtn && !openBtn.contains(event.target))) {
                            container.style.display = "none";
                        }
                    });
            });
        }
    } catch (error) {
        postContainer.innerHTML = `<h2>${error.message}</h2>`;
    }
}

async function getPostComments(postId) {
    try {
        const res = await fetch(`/comments/${postId}`);
        return res.ok ? await res.json() : { comments: [] };
    } catch (error) {
        return { comments: [] };
    }
}

getAllPosts();