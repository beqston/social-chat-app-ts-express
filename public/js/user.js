const userContainer = document.getElementById("user");

async function getOtherUser() {
    const userId = window.location.pathname.split('/')[2]
    
    try {
        const res = await fetch(`/api/v1/user/${userId}`);

        if(!res.ok) throw new Error("User not found!!")
        
        const {user} = await res.json();
        console.log(user);


        userContainer.innerHTML += `
            ${user.image 
                ? `<img class="profile-image" src="${user.image}" id="avatar-preview" class="profile-img"alt="${c.user.username}" />` 
                : `<div class="profile-image">${user.username[0].toUpperCase()}</div>`
            }
            <br />
            <div class="active-cnt">
                    ${user.active?"<div class='onsite'></div>":"<div class='ofline'></div>"}
                    <p>${user.lastActiveAgo}</p>
            </div>
            <h2>${user.username}</h2>
            <button class="send-message-btn"><img src="/images/header/message.png" alt="Message" /></button>
        `

            const button = userContainer.querySelector('button');
            button.addEventListener('click', async() => {
                window.location.href = "/chat/"+user._id
            });

    } catch (error) {
        userContainer.innerHTML = `<h1>${error.message}</h1>`
    }
}

getOtherUser()