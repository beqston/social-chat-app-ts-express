const imageInput = document.getElementById("image");
const previewImg = document.getElementById("show-image-previw");
const previewWrapper = document.getElementById("preview-wrapper");
const removeBtn = document.getElementById("remove-img-btn");

imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (file) {
        // Create a temporary URL for the image
        const reader = new URL(URL.createObjectURL(file));
        
        previewImg.src = reader;
        previewWrapper.style.display = "block";
    }
});

// Clear the image if the user clicks the "X"
removeBtn.addEventListener("click", () => {
    imageInput.value = ""; // Clear the input
    previewWrapper.style.display = "none";
    previewImg.src = "";
});

const postContainer = document.getElementById("posts-container");

async function getAllPosts() {
    try {
        const res = await fetch("/api/v1/posts");
        
        if(!res.ok){
            const error = await res.json().catch(()=>({}));
            throw new Error(error || "Something Wrong")
        }
        const posts = await res.json();
        
        postContainer.innerHTML=''

        posts.data.forEach((post)=>{
            postContainer.innerHTML += `
            <div class="post-wrapper">
                ${post.text ? `<h3>${post.text}</h3>` : ""}
                ${post.image ? `<img src="${post.image}" alt="Post content" />` : ""}

                <div class="like-comment-wrapper">
                    <img src="/images/home/like.png" alt="Upload Image">
                    <img src="/images/home/comment.png" alt="Upload Image">
                </div>

                <div class="all-comments-conainer">

                    <div class="comments-close-container">
                        <ul>
                            <li>Comment</li>
                            <li>Comment</li>
                            <li>Comment</li>
                            <li>Comment</li>
                            <li>Comment</li>
                            <li>Comment</li>
                            <li>Comment</li>
                        </ul>
                        <div class="close-comment"><img src="images/home/close.png" /></div>
                    </div>

                    <form class="create-comment-form" action="/add-comment" method="POST">
                        <input type="text" name="text" />
                        <button><img src="/images/home/send.png" alt="Upload Image"></button>
                    </form>
                </div>
            </div>
            `
        })
    
    } catch (error) {
        postContainer.innerHTML = `<h2>${error.message}</h2>`
    }
}

getAllPosts();