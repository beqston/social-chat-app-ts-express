const usersCNT = document.getElementById('users');

async function fetchMessage(id) {
    try {
        const res = await fetch(`/message/${id}`);

        // If you want to redirect after POST
        if (res.redirected) {
            // The server sent a redirect
            window.location.href = res.url;
        } else {
            // Fallback: manually redirect
            window.location.href = '/message/'+id;
        }

    } catch (err) {
        console.error(err);
    }
};

async function getChatID(item) {
  const resUser = await fetch("/api/v1/me");
  const userID = await resUser.json();

  const resChats = await fetch("/api/v1/chats");
  const { data: chats } = await resChats.json();

  const chat = chats.find(chat =>
    chat.participants.includes(userID) &&
    chat.participants.includes(item._id)
  );

  return chat ? chat._id : null
}


function getRelativeTime(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  return date.toLocaleDateString(); // Fallback to date
}

async function getUsers() {
    try {
        const res = await fetch('/api/v1/users');

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error || 'You have error');
        }

        const users = await res.json();
        usersCNT.innerHTML = '';

        users.data.forEach(async(user) => {
            // Create a container for each user
            const userDiv = document.createElement('div');
            userDiv.className = 'user-cnt';
            userDiv.innerHTML = `
                <div>
                    ${user.image 
                        ? `<img class="profile-image" src="${user.image}" id="avatar-preview" class="profile-img">` 
                        : `<div class="profile-image">${user.username[0].toUpperCase()}</div>`
                    }
                </div>
                <h2>${user.username}</h2>
                <h2>${user.email}</h2>
                <div class="active-cnt">
                    ${user.active?"<div class='onsite'></div>":"<div class='ofline'></div>"}
                    <p>${user.lastActiveAgo}</p>
                </div>
                <button class="send-message-btn"><img src="/images/header/message.png" alt="Message" /></button>
            `;

            // Attach click listener to this button
            const button = userDiv.querySelector('button');
            button.addEventListener('click', async() => {
                const chatID = await getChatID(user)
                await fetchMessage(chatID);
                window.location.href = "/chat/"+user._id
            });

            // Append the user div to the container
            usersCNT.appendChild(userDiv);
        });

    } catch (error) {
        console.error(error);
    }
}


getUsers();
