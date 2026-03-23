const userContainer = document.getElementById("user");
const userPostContainer = document.getElementById("user-posts");

async function getOtherUser() {
    const userId = window.location.pathname.split('/')[2]
    
    try {
        const res = await fetch(`/api/v1/user/${userId}`);

        if(!res.ok) throw new Error("User not found!!")
        
        const {user} = await res.json();

        userContainer.innerHTML += `
            ${user.image 
                ? `<img class="profile-photo" src="${user.image}" alt="${c.user.username}" />` 
                : `<div class="profile-photo">${user.username[0].toUpperCase()}</div>`
            }
            <br />
            <div class="active-cnt">
                    ${user.active?"<div class='onsite'></div>":"<div class='ofline'></div>"}
                    <p>${user.lastActiveAgo}</p>
            </div>
            <h2>${user.username}</h2>
            <h2>tets</h2>
            <button class="send-message-btn"><img src="/images/header/message.png" alt="Message" /></button>
        `

        const button = userContainer.querySelector('button');
        button.addEventListener('click', async() => {
            window.location.href = "/chat/"+user._id
        });

            // get user's posts
            const resUser = await fetch("/api/v1/users-post/"+user._id);
            if(!resUser.ok){
                return userPostContainer.innerHTML="<h2 class='error'>Something Wrong!!!</h2>"
            }
            const userPosts = await resUser.json();
            if(userPosts.posts.length == 0){
                return userPostContainer.innerHTML="<h2 class='not-found'>Post Not Found</h2>"
            }

            userPosts.posts.forEach(post => {
                const postWrapper = document.createElement("div");
                postWrapper.className="user-post-wrapper"
                postWrapper.innerHTML=`
                    ${user.image 
                        ? `<img class="profile-image" src="${user.image}" alt="${c.user.username}" />` 
                        : `<div class="profile-image">${user.username[0].toUpperCase()}</div>`
                    }

                    <div class="user-posts-content">
                        ${post.text? `<h2>${post.text}</h2>`:""}
                        ${post.image?`<img src="${post.image} alt="posts-image/>`:""}
                    </div>

                `
                userPostContainer.appendChild(postWrapper)
            });


    } catch (error) {
        userContainer.innerHTML = `<h1>${error.message}</h1>`
    }
}

getOtherUser()