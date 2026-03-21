// Selectors
const errorMessageElement = document.getElementById("error-message-p");
const successMessageElement = document.getElementById("success-message-p");

// get post elements
const imageInput = document.getElementById("image");
const previewImg = document.getElementById("show-image-previw");
const previewWrapper = document.getElementById("preview-wrapper");
const removeBtn = document.getElementById("remove-img-btn");
const editPostMainContainer = document.getElementById("edit-post");

// post edit elements
const editImageInput = document.getElementById("newImage");
const editInputText = document.getElementById("newText");
const removeEditImageBtn = document.getElementById("remove-edit-img-btn");
const previewEditWrapper = document.getElementById("preview-edit-wrapper");
const previwEditImage = document.getElementById("show-edit-image-previw");
const editPostForm = document.getElementById("post-edit-cnt");

// current user id
let currentUserId;

// New post image preview
imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
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
const statusMessage = document.getElementById("status-message");

function showMessage(message, color) {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.style.backgroundColor = color;
    statusMessage.style.display = "block";
    statusMessage.style.opacity = "1";
    setTimeout(() => {
        statusMessage.style.display = "none";
    }, 3000);
}

// ✅ Reset edit form helper
function resetEditForm() {
    editInputText.value = "";
    previwEditImage.src = "";
    previewEditWrapper.style.display = "none";
    editImageInput.value = "";
}

async function getAllPosts() {
    try {
        const res = await fetch("/api/v1/posts");
        if (!res.ok) throw new Error("Could not fetch posts");

        const resMe = await fetch("/api/v1/me");
        const userId = await resMe.json();
        currentUserId = userId;

        const posts = await res.json();
        postContainer.innerHTML = '';

        for (const post of posts.data) {
            const commentData = await getPostComments(post._id);
            const comments = commentData.comments || [];

            const isLiked = post.likes.some((likeId) => likeId.toString() === userId.toString());

            const postWrapper = document.createElement("div");
            postWrapper.className = "post-wrapper";
            const isAuthor = post.user._id == userId;

            postWrapper.innerHTML = `
                <div class="post-head-container">
                    <a href="/user/${post.user._id}">
                        ${post.user.image
                            ? `<img class="profile-image" src="${post.user.image}" alt="${post.user.username}" />`
                            : `<div class="profile-image">${post.user.username[0].toUpperCase()}</div>`
                        }
                        <p>${post.user.username}</p>
                    </a>
                    ${isAuthor ? `
                        <div class="post-edit-delete-wrapper" id="post-edit-delete-wrapper-${post._id}">
                            <button class="options">...</button>
                            <div class="post-edit-delete">
                                <button class="edit">Edit</button>
                                <button class="delete">Delete</button>
                            </div>
                        </div>
                    ` : ""}
                </div>

                <div class="post-user">
                    <div>
                        ${post.text ? `<h3 class="post-title">${post.text}</h3>` : ""}
                        ${post.image ? `<img src="${post.image}" alt="Post content" />` : ""}
                    </div>
                </div>

                <div class="like-comment-wrapper">
                    <div class="stat-item">
                        <img class="like-btn" src="${isLiked ? '/images/home/isLike.png' : '/images/home/like.png'}" alt="Like"/>
                        <span id="like-count-${post._id}">${post.likes.length}</span>
                    </div>
                    <div class="stat-item">
                        <img class="comment-btn" src="/images/home/comment.png" alt="Comment">
                        <span id="comment-count-${post._id}">${comments.length}</span>
                    </div>
                </div>

                <div class="all-comments-container">
                    <div class="comments-close-container">
                        <ul class="comments-list" id="comments-list-${post._id}">
                            ${comments.map(c => `
                                <li class="comment-container">
                                    <div>
                                        ${c.user.image
                                            ? `<img class="profile-image" src="${c.user.image}" alt="${c.user.username}" />`
                                            : `<div class="profile-image">${c.user.username[0].toUpperCase()}</div>`
                                        }
                                    </div>
                                    <div class="username-comment">
                                        <a href="/user/${c.user._id}">${c.user.username}</a>
                                        <div class="comment-wrapper">
                                            <p class="comment-content" id="comment-text-${c._id}">${c.text}</p>
                                            ${c.user._id == userId ? `
                                                <div class="comment-edit-delete-cnt">
                                                    <button class="options">...</button>
                                                    <div class="edit-delete-wrapper">
                                                        <button class="edit">Edit</button>
                                                        <button class="delete">Delete</button>
                                                    </div>
                                                </div>
                                            ` : ""}
                                        </div>
                                    </div>
                                </li>
                            `).join('')}
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

            // ── Author Actions ───────────────────────────────────────
            if (isAuthor) {
                const postOptions = postWrapper.querySelector(`#post-edit-delete-wrapper-${post._id} .options`);
                const postEditDeleteWrapper = postWrapper.querySelector(`#post-edit-delete-wrapper-${post._id} .post-edit-delete`);
                const postEditButton = postWrapper.querySelector(`#post-edit-delete-wrapper-${post._id} .edit`);
                const postDeleteBtn = postWrapper.querySelector(`#post-edit-delete-wrapper-${post._id} .delete`);
                const deleteWindowContainer = document.getElementById("delete-window-wrapper");
                const deletePost = document.querySelector("#post-delete-wrapper .delete");
                const closeDeleteWindow = document.querySelector("#post-delete-wrapper .close");
                const closePostEdit = document.getElementById("close-edit");

                // Open options menu
                postOptions.addEventListener("click", () => {
                    postEditDeleteWrapper.style.display = "flex";
                });

                // Close options on outside click
                window.addEventListener("click", (e) => {
                    if (
                        window.getComputedStyle(postEditDeleteWrapper).display !== "none" &&
                        e.target.contains(postEditDeleteWrapper)
                    ) {
                        postEditDeleteWrapper.style.display = "none";
                    }
                });

                // Open delete confirmation window
                postDeleteBtn.addEventListener("click", () => {
                    deleteWindowContainer.style.display = "grid";
                    postEditDeleteWrapper.style.display = "none";
                });

                // Close delete window
                closeDeleteWindow.addEventListener("click", () => {
                    deleteWindowContainer.style.display = "none";
                });

                // Confirm delete
                deletePost.addEventListener("click", async (e) => {
                    e.preventDefault();
                    try {
                        const res = await fetch(`/post-delete/${post._id}`, {
                            method: "DELETE",
                            credentials: "include"
                        });
                        if (!res.ok) throw new Error("Post not deleted!");
                        deleteWindowContainer.style.display = "none";
                        postWrapper.remove();
                        showMessage("Post deleted successfully", "green");
                    } catch (error) {
                        showMessage("Post not deleted!", "#ff4444");
                    }
                });

                // ✅ Open edit modal — load post data
                postEditButton.addEventListener("click", async () => {
                    try {
                        // Reset form before loading
                        resetEditForm();

                        const res = await fetch("/api/v1/post/" + post._id);
                        if (!res.ok) {
                            const error = await res.json().catch(() => ({}));
                            throw new Error(error.message || "Something went wrong");
                        }
                        const postData = await res.json();

                        // ✅ Populate text
                        if (postData.post.text) {
                            editInputText.value = postData.post.text;
                        }

                        // ✅ Populate existing image preview
                        if (postData.post.image) {
                            previwEditImage.src = postData.post.image;
                            previewEditWrapper.style.display = "block";
                        }

                        editPostMainContainer.style.display = "block";
                        postEditDeleteWrapper.style.display = "none";

                        // ✅ Clone submit button to remove stacked listeners
                        const submitEditPost = document.getElementById("post-edit-btn");
                        submitEditPost.replaceWith(submitEditPost.cloneNode(true));
                        const freshSubmitBtn = document.getElementById("post-edit-btn");

                        // ✅ Submit edit, send form and edit post
                        freshSubmitBtn.addEventListener("click", async (e) => {
                            e.preventDefault();
                            try {
                                const formData = new FormData();

                                // ✅ Append text if exists
                                if (editInputText.value.trim()) {
                                    formData.append("text", editInputText.value.trim());
                                }

                                // ✅ Append new image file if user selected one
                                if (editImageInput.files[0]) {
                                    formData.append("image", editImageInput.files[0]);
                                }

                                const res = await fetch(`/post-edit/${post._id}`, {
                                    method: "PATCH",
                                    credentials: "include",
                                    body: formData
                                });

                                if (!res.ok) throw new Error("Post not edited!");

                                const updatedPost = await res.json();

                                // ✅ Update UI without full page reload
                                const postTitle = postWrapper.querySelector(".post-title");
                                const postImage = postWrapper.querySelector(".post-user img");

                                if (updatedPost.data.text) {
                                    if (postTitle) {
                                        postTitle.textContent = updatedPost.data.text;
                                    } else {
                                        const postUserDiv = postWrapper.querySelector(".post-user div");
                                        postUserDiv.insertAdjacentHTML("afterbegin", `<h3 class="post-title">${updatedPost.data.text}</h3>`);
                                    }
                                }

                                if (updatedPost.data.image) {
                                    if (postImage) {
                                        postImage.src = updatedPost.data.image;
                                    } else {
                                        const postUserDiv = postWrapper.querySelector(".post-user div");
                                        postUserDiv.insertAdjacentHTML("beforeend", `<img src="${updatedPost.data.image}" alt="Post content" />`);
                                    }
                                }

                                editPostMainContainer.style.display = "none";
                                resetEditForm();
                                showMessage("Post edited successfully", "green");

                            } catch (error) {
                                showMessage("Post not edited!", "#ff4444");
                            }
                        });

                    } catch (error) {
                        showMessage(error.message, "red");
                    }
                });

                // Close edit modal
                closePostEdit.addEventListener("click", () => {
                    editPostMainContainer.style.display = "none";
                    resetEditForm();
                });
            }

            // ── Like Logic ───────────────────────────────────────────
            const likeButton = postWrapper.querySelector('.like-comment-wrapper .like-btn');
            likeButton.addEventListener("click", async () => {
                const img = postWrapper.querySelector(".like-comment-wrapper .like-btn");
                try {
                    const res = await fetch("/like-post/" + post._id, {
                        method: "POST",
                        credentials: "include"
                    });
                    if (!res.ok) throw new Error("Something Wrong!!");

                    if (res.status == 201) {
                        img.src = '/images/home/isLike.png';
                        showMessage("Post liked successfully", "green");
                        const countEl = document.getElementById(`like-count-${post._id}`);
                        if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
                    } else {
                        img.src = '/images/home/like.png';
                        showMessage("Post unliked successfully", "green");
                        const countEl = document.getElementById(`like-count-${post._id}`);
                        if (countEl) countEl.textContent = parseInt(countEl.textContent) - 1;
                    }
                } catch (error) {
                    showMessage(error.message, "red");
                }
            });

            // ── Comment Form ─────────────────────────────────────────
            const commentForm = postWrapper.querySelector(".create-comment-form");
            const textarea = postWrapper.querySelector("textarea");

            textarea.addEventListener("keydown", (event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    commentForm.requestSubmit();
                }
            });

            textarea.addEventListener("input", () => {
                socket.emit("typing_comment", { postId: post._id });
            });

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
                        credentials: "include"
                    });
                    if (!res.ok) throw new Error("Failed to add comment");
                    commentForm.reset();
                    showMessage("Comment added successfully", "green");
                } catch (err) {
                    showMessage(err.message, "red");
                }
            });

            // ── Comment Window ───────────────────────────────────────
            const commentMainContainer = postWrapper.querySelector(".all-comments-container");

            postWrapper.querySelector(".comment-btn").addEventListener("click", () => {
                commentMainContainer.style.display = "flex";
                commentMainContainer.scrollTop = commentMainContainer.scrollHeight;
            });

            postWrapper.querySelector(".close-comment-window").addEventListener("click", () => {
                commentMainContainer.style.display = "none";
            });

            // ── Comment Edit/Delete ──────────────────────────────────
            const commentContainers = postWrapper.querySelectorAll(".comment-container");

            commentContainers.forEach((container, index) => {
                const comment = comments[index];
                const optionsBtn = container.querySelector(".options");
                const editDeleteWrapper = container.querySelector(".edit-delete-wrapper");
                const editButton = editDeleteWrapper?.querySelector(".edit");
                const commentContentEl = container.querySelector(".comment-content");

                if (!optionsBtn || !editDeleteWrapper) return;

                optionsBtn.addEventListener("click", () => {
                    editDeleteWrapper.style.display = "block";
                    optionsBtn.style.display = "none";
                });

                editDeleteWrapper.addEventListener("mouseleave", () => {
                    editDeleteWrapper.style.display = "none";
                    optionsBtn.style.display = "block";
                });

                if (editButton) {
                    editButton.addEventListener("click", (e) => {
                        e.preventDefault();
                        editDeleteWrapper.style.display = "none";
                        optionsBtn.style.display = "block";

                        const originalText = commentContentEl.textContent;
                        commentContentEl.innerHTML = `
                            <div class="edit-input-wrapper">
                                <input type="text" class="edit-input" value="${originalText}" style="width: 100%; margin-bottom: 5px;" />
                                <button class="save-edit-btn" style="background: green; cursor: pointer; color: white; padding: 2px 5px;">Save</button>
                                <button class="cancel-edit-btn" style="background: gray; cursor: pointer; color: white; padding: 2px 5px;">Cancel</button>
                            </div>
                        `;

                        const inputEl = commentContentEl.querySelector(".edit-input");
                        const saveBtn = commentContentEl.querySelector(".save-edit-btn");
                        const cancelBtn = commentContentEl.querySelector(".cancel-edit-btn");

                        cancelBtn.addEventListener("click", () => {
                            commentContentEl.textContent = originalText;
                        });

                        saveBtn.addEventListener("click", async () => {
                            const newText = inputEl.value.trim();
                            if (!newText || newText === originalText) {
                                commentContentEl.textContent = originalText;
                                return;
                            }
                            try {
                                const res = await fetch("/edit-comment/" + comment._id, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "include",
                                    body: JSON.stringify({ text: newText })
                                });
                                if (!res.ok) throw new Error("Failed to edit comment");
                                commentContentEl.textContent = newText;
                                showMessage("Comment edited successfully", "green");
                            } catch (error) {
                                showMessage(error.message, "red");
                                commentContentEl.textContent = originalText;
                            }
                        });
                    });
                }

                const deleteButton = editDeleteWrapper.querySelector(".delete");
                if (deleteButton) {
                    deleteButton.addEventListener("click", async (e) => {
                        e.preventDefault();
                        try {
                            const res = await fetch("/delete-comment/" + comment._id, {
                                method: "DELETE",
                                credentials: "include"
                            });
                            if (!res.ok) {
                                const errorData = await res.json();
                                throw new Error(errorData.message || "Failed to delete comment");
                            }
                            container.remove();
                            showMessage("Comment deleted successfully", "green");
                        } catch (error) {
                            showMessage(error.message, "red");
                        }
                    });
                }
            });
        }
    } catch (error) {
        postContainer.innerHTML = `<h2>${error.message}</h2>`;
    }
}

// Close comments on scroll
window.addEventListener("scroll", () => {
    document.querySelectorAll(".all-comments-container").forEach(container => {
        if (window.getComputedStyle(container).display !== "none") {
            container.style.display = "none";
        }
    });
}, { passive: true });

// Get post comments
async function getPostComments(postId) {
    try {
        const res = await fetch(`/comments/${postId}`);
        return res.ok ? await res.json() : { comments: [] };
    } catch (error) {
        return { comments: [] };
    }
}

// Init
getAllPosts();

// Socket.io
const socket = io();

// New comment received
socket.on("new_comment", (data) => {
    document.querySelectorAll(".post-wrapper").forEach(postWrapper => {
        const hiddenInput = postWrapper.querySelector("input[name='postId']");
        if (!hiddenInput || hiddenInput.value !== data.postId) return;

        const ul = postWrapper.querySelector(".comments-list");
        const isAuthor = data.comment.user._id === currentUserId;

        const newCommentHTML = `
            <li class="comment-container" id="comment-container-${data.comment._id}">
                <div>
                    ${data.comment.user.image
                        ? `<img class="profile-image" src="${data.comment.user.image}" alt="${data.comment.user.username}" />`
                        : `<div class="profile-image">${data.comment.user.username[0].toUpperCase()}</div>`
                    }
                </div>
                <div class="username-comment">
                    <a href="/user/${data.comment.user._id}">${data.comment.user.username}</a>
                    <div class="comment-wrapper">
                        <p class="comment-content">${data.comment.text}</p>
                        ${isAuthor ? `
                            <div class="comment-edit-delete-cnt">
                                <button class="options">...</button>
                                <div class="edit-delete-wrapper">
                                    <button class="edit">Edit</button>
                                    <button class="delete">Delete</button>
                                </div>
                            </div>
                        ` : ""}
                    </div>
                </div>
            </li>`;

        ul.insertAdjacentHTML("beforeend", newCommentHTML);

        if (isAuthor) {
            const newComment = document.getElementById(`comment-container-${data.comment._id}`);
            const optionsBtn = newComment.querySelector(".options");
            const editDeleteDiv = newComment.querySelector(".edit-delete-wrapper");
            const editBtn = newComment.querySelector(".edit");
            const deleteBtn = newComment.querySelector(".delete");
            const commentContentEl = newComment.querySelector(".comment-content");

            editDeleteDiv.addEventListener("mouseleave", () => {
                editDeleteDiv.style.display = "none";
                optionsBtn.style.display = "block";
            });

            optionsBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                editDeleteDiv.style.display = editDeleteDiv.style.display === "block" ? "none" : "block";
            });

            editBtn.addEventListener("click", () => {
                editDeleteDiv.style.display = "none";
                const originalText = commentContentEl.textContent;
                commentContentEl.innerHTML = `
                    <div class="edit-input-wrapper">
                        <input type="text" class="edit-input" value="${originalText}" style="width: 100%; margin-bottom: 5px;" />
                        <button class="save-edit-btn" style="background: green; cursor: pointer; color: white; padding: 2px 5px;">Save</button>
                        <button class="cancel-edit-btn" style="background: gray; cursor: pointer; color: white; padding: 2px 5px;">Cancel</button>
                    </div>
                `;

                const inputEl = commentContentEl.querySelector(".edit-input");
                const saveBtn = commentContentEl.querySelector(".save-edit-btn");
                const cancelBtn = commentContentEl.querySelector(".cancel-edit-btn");

                cancelBtn.addEventListener("click", () => {
                    commentContentEl.textContent = originalText;
                });

                saveBtn.addEventListener("click", async () => {
                    const newText = inputEl.value.trim();
                    if (!newText || newText === originalText) {
                        commentContentEl.textContent = originalText;
                        return;
                    }
                    try {
                        const res = await fetch("/edit-comment/" + data.comment._id, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ text: newText })
                        });
                        if (!res.ok) throw new Error("Failed to edit comment");
                        commentContentEl.textContent = newText;
                        showMessage("Comment edited successfully", "green");
                    } catch (error) {
                        showMessage(error.message, "red");
                        commentContentEl.textContent = originalText;
                    }
                });
            });

            deleteBtn.addEventListener("click", async () => {
                try {
                    const res = await fetch("/delete-comment/" + data.comment._id, {
                        method: "DELETE",
                        credentials: "include"
                    });
                    if (!res.ok) throw new Error("Failed to delete comment");
                    newComment.remove();
                    showMessage("Comment deleted successfully", "green");
                    const countEl = document.getElementById(`comment-count-${data.postId}`);
                    if (countEl) countEl.textContent = parseInt(countEl.textContent) - 1;
                } catch (error) {
                    showMessage(error.message, "red");
                }
            });
        }

        const countEl = document.getElementById(`comment-count-${data.postId}`);
        if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;

        const commentContainer = postWrapper.querySelector(".all-comments-container");
        if (window.getComputedStyle(commentContainer).display !== "none") {
            commentContainer.scrollTop = commentContainer.scrollHeight;
        }
    });
});

// Typing indicator
socket.on("typing_comment", (data) => {
    document.querySelectorAll(".post-wrapper").forEach(postWrapper => {
        const hiddenInput = postWrapper.querySelector("input[name='postId']");
        if (!hiddenInput || hiddenInput.value !== data.postId) return;

        let typingEl = postWrapper.querySelector(".typing-indicator");
        if (!typingEl) {
            typingEl = document.createElement("p");
            typingEl.className = "typing-indicator";
            const commentForm = postWrapper.querySelector(".create-comment-form");
            commentForm.insertAdjacentElement("beforebegin", typingEl);
        } else {
            typingEl.style.display = "block";
        }

        typingEl.textContent = "Someone is typing...";

        const commentContainer = postWrapper.querySelector(".all-comments-container");
        if (window.getComputedStyle(commentContainer).display !== "none") {
            commentContainer.scrollTop = commentContainer.scrollHeight;
        }

        clearTimeout(typingEl._timeout);
        typingEl._timeout = setTimeout(() => {
            typingEl.textContent = "";
            typingEl.style.display = "none";
        }, 2000);
    });
});

// Comment updated by another user
socket.on("comment_updated", (data) => {
    const { commentId, newText, postId } = data;
    const postUl = document.getElementById(`comments-list-${postId}`);
    if (!postUl) return;

    const commentTextEl = document.getElementById(`comment-text-${commentId}`);
    if (commentTextEl) {
        commentTextEl.textContent = newText;
        commentTextEl.style.transition = "background 0.5s";
        commentTextEl.style.backgroundColor = "#fff9c4";
        setTimeout(() => commentTextEl.style.backgroundColor = "#f0f2f8", 1000);
    }
});

// Comment deleted by another user
socket.on("comment_deleted", (data) => {
    const { commentId, postId } = data;
    const commentContainer = document.getElementById(`comment-container-${commentId}`);
    if (commentContainer) {
        commentContainer.style.opacity = "0";
        setTimeout(() => commentContainer.remove(), 300);
    }
    const countEl = document.getElementById(`comment-count-${postId}`);
    if (countEl) countEl.textContent = parseInt(countEl.textContent) - 1;
});

// Edit post image preview
editImageInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        previwEditImage.src = URL.createObjectURL(file);
        previewEditWrapper.style.display = "block";
    }
});

// Remove edit post image
removeEditImageBtn.addEventListener('click', () => {
    previwEditImage.src = "";
    previewEditWrapper.style.display = "none";
    editImageInput.value = "";
});