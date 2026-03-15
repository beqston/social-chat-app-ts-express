// Selectors
const errorMessageElement = document.getElementById("error-message-p");
const successMessageElement = document.getElementById("success-message-p");

// Image Logic
const imageInput = document.getElementById("image");
const previewImg = document.getElementById("show-image-previw");
const previewWrapper = document.getElementById("preview-wrapper");
const removeBtn = document.getElementById("remove-img-btn");
const editPostMainContainer = document.getElementById("edit-post");

// current user id
let currentUserId;

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

async function getAllPosts() {
    try {
        const res = await fetch("/api/v1/posts");
        if (!res.ok) throw new Error("Could not fetch posts");

        const resMe = await fetch("/api/v1/me");
        const userId = await resMe.json();
        currentUserId=userId;

        const posts = await res.json();
        postContainer.innerHTML = '';

        for (const post of posts.data) {
            const commentData = await getPostComments(post._id);
            const comments = commentData.comments || [];

            const isLiked = post.likes.some((likeId) => likeId.toString() === userId.toString());

            const postWrapper = document.createElement("div");
            postWrapper.className = "post-wrapper";
            const isAuthor = post.user._id == userId

            postWrapper.innerHTML = `
                <div class="post-head-container">
                    <a href="/user/${post.user._id}">
                        ${post.user.image
                            ? `<img class="profile-image" src="${post.user.image}" alt="${post.user.username}" />`
                            : `<div class="profile-image">${post.user.username[0].toUpperCase()}</div>`
                        }
                        <p>${post.user.username}</p>
                    </a>
                    
                    ${
                        isAuthor? `
                            <div class="post-edit-delete-wrapper" id="post-edit-delete-wrapper-${post._id}">
                                <button class="options">...</button>
                                <div class="post-edit-delete">
                                    <button class="edit">Edit</button>
                                    <button class="delete">Delete</button>
                                </div>
                            </div>
                        `:""
                    }
                </div>

                <div class="post-user">
                    <div>
                        ${post.text ? `<h3 class="post-title">${post.text}</h3>` : ""}
                        ${post.image ? `<img src="${post.image}" alt="Post content" />` : ""}
                    </div>
                </div>

                <div class="like-comment-wrapper">
                    <div class="stat-item">
                        <img class="like-btn" src=${isLiked ? '/images/home/isLike.png' : '/images/home/like.png'} alt="Like"/>
                        <span id="like-count-${post._id}">
                            ${post.likes.length}
                        </span>
                    </div>
                    
                    <div class="stat-item">
                        <img class="comment-btn" src="/images/home/comment.png" alt="Comment">
                        <span id="comment-count-${post._id}">
                            ${comments.length}
                        </span>
                    </div>
                </div>

                <div class="all-comments-container">
                    <div class="comments-close-container">
                        <ul class="comments-list" id="comments-list-${post._id}">
                            ${comments.map(c =>
                                 `
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
                                            <p class="comment-content" add id="comment-text-${c._id}">${c.text}</p>
                                        ${
                                            c.user._id ==userId? `<div class="comment-edit-delete-cnt">
                                                <button class="options">...</button>
                                                <div class="edit-delete-wrapper">
                                                    <button class="edit">Edit</button>
                                                    <button class="delete">Delete</button>
                                                </div>
                                            </div>`:""
                                        }

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

            // <<----->>>>

            if(isAuthor){
                const postOptions = postWrapper.querySelector(`#post-edit-delete-wrapper-${post._id} .options`)
                const postEditDeleteWrapper = postWrapper.querySelector(`#post-edit-delete-wrapper-${post._id} .post-edit-delete`)
                const postEditButton = postWrapper.querySelector(`#post-edit-delete-wrapper-${post._id} .edit`)
                const postDelete = postWrapper.querySelector(`#post-edit-delete-wrapper-${post._id} .delete`)
                const submitEditPost = document.getElementById("post-edit-btn");
                const deleteWindowContainer = document.getElementById("delete-window-wrapper");
                const deletePost = document.querySelector("#post-delete-wrapper .delete");
                const closeDeleteWindow = document.querySelector("#post-delete-wrapper .close");
                const closePostEdit = document.getElementById("close-edit");


                deletePost.addEventListener("click", async(e)=>{
                    e.preventDefault();
                    try {
                        const res = await fetch(`/post-delete/${post._id}`, {
                            method:"DELETE",
                            credentials:"include"
                        });
                        if(!res.ok) throw new Error("Post does not deleted!");
                        deleteWindowContainer.style.display="none";
                        postWrapper.remove();
                        showMessage("Post deleted successfully", "green");
                    } catch (error) {
                        showMessage("Post does not deleted!", "#ff4444");
                    }
                })
                

                submitEditPost.addEventListener("click", async(e)=>{
                    e.preventDefault();
                    try {

                        await fetch(`/post-edit/${post._id}`, {
                            method:"PATCH",
                            credentials:"include"
                        });

                        showMessage("Post edited successfully", "green");
                        
                    } catch (error) {
                        showMessage("Post does not edited!", "#ff4444");
                    }
                })

                window.addEventListener("click", (e)=>{
                    if(window.getComputedStyle(postEditDeleteWrapper).display !== "none" && e.target.contains(postEditDeleteWrapper) ){
                        postEditDeleteWrapper.style.display ="none"
                    }
                })
                
                postOptions.addEventListener("click", ()=>{
                    postEditDeleteWrapper.style.display="flex"
                });

                postDelete.addEventListener("click", ()=>{
                    deleteWindowContainer.style.display="grid";
                    postEditDeleteWrapper.style.display ="none"
                    
                });

                closeDeleteWindow.addEventListener("click", ()=>{
                    deleteWindowContainer.style.display="none";
                })
                postEditButton.addEventListener("click", ()=>{
                    editPostMainContainer.style.display="block";
                    postEditDeleteWrapper.style.display ="none"
                });

                closePostEdit.addEventListener("click", ()=>{
                    editPostMainContainer.style.display ="none";
                })
            }

    

            // <-------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>

            // Like button, like unlike logic
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
                        if(countEl){
                            let count = parseInt(countEl.textContent);
                            countEl.textContent = count + 1;
                        }
                    } else {
                        img.src = '/images/home/like.png';
                        showMessage("Post unliked successfully", "green");

                        const countEl = document.getElementById(`like-count-${post._id}`);
                        if(countEl){
                            let count = parseInt(countEl.textContent);
                            countEl.textContent = count - 1;
                        }
                    }
                } catch (error) {
                    showMessage(`${error.message}`, "red");
                }
            });


            // Textarea — keydown + typing emit
            const textarea = postWrapper.querySelector("textarea");

            textarea.addEventListener("keydown", (event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    commentForm.requestSubmit();
                }
            });

            // typing emit
            textarea.addEventListener("input", () => {
                socket.emit("typing_comment", {
                    postId: post._id
                });
            });

            // Comment form submit
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

                } catch (err) {
                    showMessage(err.message, "red");
                }
            });

            // Comment container
            const commentMainContainer = postWrapper.querySelector(".all-comments-container");

            // Open comments
            const openCommentWindow = postWrapper.querySelector(".comment-btn");
            openCommentWindow.addEventListener("click", () => {
                commentMainContainer.style.display = "flex";
                commentMainContainer.scrollTop = commentMainContainer.scrollHeight;
            });

            // Close comments
            const closeCommentWindow = postWrapper.querySelector(".close-comment-window");
            closeCommentWindow.addEventListener("click", () => {
                commentMainContainer.style.display = "none";
            });


            // <<---COMMENTS--->>

            // 1. Grab all rendered comment containers inside this post
            const commentContainers = postWrapper.querySelectorAll(".comment-container");

            // 2. Loop through the containers and match them with the comments data array via the index
            commentContainers.forEach((container, index) => {
                // Get the specific comment data for this specific HTML element
                const comment = comments[index]; 

                const optionsBtn = container.querySelector(".options");
                const editDeleteWrapper = container.querySelector(".edit-delete-wrapper");
                const editButton = editDeleteWrapper?.querySelector(".edit");
                const commentContentEl = container.querySelector(".comment-content"); // The <p> holding the text

                // Safety check in case the user isn't authorized and the buttons don't exist
                if (!optionsBtn || !editDeleteWrapper) return;

                // Show/Hide Options Menu
                optionsBtn.addEventListener("click", () => {
                    editDeleteWrapper.style.display = "block";
                    optionsBtn.style.display = "none";
                });

                editDeleteWrapper.addEventListener("mouseleave", () => {
                    editDeleteWrapper.style.display = "none";
                    optionsBtn.style.display = "block";
                });

                // Handle Edit Button Click
                if (editButton) {
                    editButton.addEventListener("click", (e) => {
                        e.preventDefault();
                        
                        // Hide the options menu while editing
                        editDeleteWrapper.style.display = "none";
                        optionsBtn.style.display = "block";

                        // 1. Store the original text
                        const originalText = commentContentEl.textContent;

                        // 2. Turn the comment text into an input field + Save/Cancel buttons
                        commentContentEl.innerHTML = `
                            <div class="edit-input-wrapper">
                                <input type="text" class="edit-input" value="${originalText}" style="width: 100%; margin-bottom: 5px;" />
                                <button class="save-edit-btn" style="background: green;cursor: pointer; color: white; padding: 2px 5px;">Save</button>
                                <button class="cancel-edit-btn" style="background: gray; cursor: pointer; color: white; padding: 2px 5px;">Cancel</button>
                            </div>
                        `;

                        const inputEl = commentContentEl.querySelector(".edit-input");
                        const saveBtn = commentContentEl.querySelector(".save-edit-btn");
                        const cancelBtn = commentContentEl.querySelector(".cancel-edit-btn");

                        // 3. Handle Cancel
                        cancelBtn.addEventListener("click", () => {
                            commentContentEl.textContent = originalText; // Revert HTML back to normal text
                        });

                        // 4. Handle Save
                        saveBtn.addEventListener("click", async () => {
                            const newText = inputEl.value.trim();
                            
                            if (!newText || newText === originalText) {
                                commentContentEl.textContent = originalText; // Revert if empty or unchanged
                                return;
                            }

                            try {
                                // Usually, edits use the "PUT" or "PATCH" method in REST APIs
                                const res = await fetch("/edit-comment/" + comment._id, {
                                    method: "PUT", // Make sure this matches your backend! (PUT, PATCH, or POST)
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    credentials: "include",
                                    body: JSON.stringify({ text: newText }) // Send the new text
                                });

                                if (!res.ok) throw new Error("Failed to edit comment");

                                // Update the UI with the newly saved text
                                commentContentEl.textContent = newText;
                                showMessage("Comment edited successfully", "green"); // Assuming you have the showMessage function from earlier

                            } catch (error) {
                                console.error(error.message);
                                showMessage(error.message, "red");
                                commentContentEl.textContent = originalText; // Revert back if the fetch failed
                            }
                        });
                    });
                }

                // Handle Delete Button Click
                const deleteButton = editDeleteWrapper.querySelector(".delete");
                if (deleteButton) {
                    deleteButton.addEventListener("click", async (e) => {
                        e.preventDefault();

                        try {
                            // 2. Send the delete request to the backend
                            const res = await fetch("/delete-comment/" + comment._id, {
                                method: "DELETE", 
                                credentials: "include"
                            });

                            if (!res.ok) {
                                const errorData = await res.json();
                                throw new Error(errorData.message || "Failed to delete comment");
                            }

                            // 3. Remove the comment completely from the screen
                            container.remove(); 
                            showMessage("Comment deleted successfully", "green");

                        } catch (error) {
                            console.error(error.message);
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
    const allContainers = document.querySelectorAll(".all-comments-container");
    allContainers.forEach(container => {
        if (window.getComputedStyle(container).display !== "none") {
            container.style.display = "none";
        }
    });
}, { passive: true });

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
    const allPostWrappers = document.querySelectorAll(".post-wrapper");

    allPostWrappers.forEach(postWrapper => {
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
                        ${
                            isAuthor? `
                                <div class="comment-edit-delete-cnt">
                                    <button class="options">...</button>
                                    <div class="edit-delete-wrapper">
                                        <button class="edit">Edit</button>
                                        <button class="delete">Delete</button>
                                    </div>
                                </div>
                            `:""
                        }

                    </div>
                </div>
            </li>`;
        ul.insertAdjacentHTML("beforeend", newCommentHTML);

        if (isAuthor) {
            const newComment = document.getElementById(`comment-container-${data.comment._id}`);
            const optionsBtn = newComment.querySelector(".options");
            const editDeleteDiv = newComment.querySelector(".edit-delete-wrapper");;
            const editBtn = newComment.querySelector(".edit");
            const deleteBtn = newComment.querySelector(".delete");
            const commentContentEl = newComment.querySelector(".comment-content");

            editDeleteDiv.addEventListener("mouseleave", () => {
                editDeleteDiv.style.display = "none";
                optionsBtn.style.display = "block";
            });

            optionsBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const isVisible = editDeleteDiv.style.display === "block";
                editDeleteDiv.style.display = isVisible ? "none" : "block";
            });

            // Edit logic
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

            // Delete logic
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
                    if (countEl) {
                        let count = parseInt(countEl.textContent);
                        countEl.textContent = count - 1;
                    }
                } catch (error) {
                    showMessage(error.message, "red");
                }
            });
        }


        // Update a comment counter 
        const countEl = document.getElementById(`comment-count-${data.postId}`);

        if (countEl) {
            let count = parseInt(countEl.textContent);
            countEl.textContent = count + 1;
        }

        const commentContainer = postWrapper.querySelector(".all-comments-container");
        if (window.getComputedStyle(commentContainer).display !== "none") {
            commentContainer.scrollTop = commentContainer.scrollHeight;
        }
    });
});

// Typing indicator received
socket.on("typing_comment", (data) => {
    const allPostWrappers = document.querySelectorAll(".post-wrapper");

    allPostWrappers.forEach(postWrapper => {
        const hiddenInput = postWrapper.querySelector("input[name='postId']");
        if (!hiddenInput || hiddenInput.value !== data.postId) return;

        let typingEl = postWrapper.querySelector(".typing-indicator");
        if (!typingEl) {
            typingEl = document.createElement("p");
            typingEl.className = "typing-indicator";
            // ✅ insertAdjacentElement 
            const commentForm = postWrapper.querySelector(".create-comment-form");
            commentForm.insertAdjacentElement("beforebegin", typingEl);
        }else{
            typingEl.style.display="block"
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

// Listen for an EDIT from another user
socket.on("comment_updated", (data) => {
    const { commentId, newText, postId } = data;
    
    // Find the specific post container first
    const postUl = document.getElementById(`comments-list-${postId}`);
    if (!postUl) return;

    // Find the specific comment text element within that post
    const commentTextEl = document.getElementById(`comment-text-${commentId}`);
    if (commentTextEl) {
        commentTextEl.textContent = newText;
        
        // Brief highlight effect to show it changed
        commentTextEl.style.transition = "background 0.5s";
        commentTextEl.style.backgroundColor = "#fff9c4";
        setTimeout(() => commentTextEl.style.backgroundColor = "#f0f2f8", 1000);
    }
});

// Listen for a DELETE from another user
socket.on("comment_deleted", (data) => {
    const { commentId, postId } = data; // Now we use both
    
    // 1. Remove the comment
    const commentContainer = document.getElementById(`comment-container-${commentId}`);
    if (commentContainer) {
        commentContainer.style.opacity = "0";
        setTimeout(() => commentContainer.remove(), 300);
    }

    //  Update a comment counter 
    const countEl = document.getElementById(`comment-count-${postId}`);

    if (countEl) {
        let count = parseInt(countEl.textContent);
        countEl.textContent = count - 1;
    }
});
