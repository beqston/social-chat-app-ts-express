const AppState = {
  originalTitle: document.title,
  currentCount: 0
};


function startTitleEngine() {
  let showCount = true;
  setInterval(()=>{
    if(AppState.currentCount>0){
      document.title=showCount?`(${AppState.currentCount}) New Messages`: AppState.originalTitle;
      showCount =!showCount;
    }else{
      if(document.title !== AppState.originalTitle){
        document.title=AppState.originalTitle
      }
    }
  }, 2000)
};


async function syncMessages() {
  try {
    // No "document.hidden" check here so it runs always
    const response = await fetch('/api/messages/count');
    const data = await response.json();
    
    AppState.currentCount = data.count;

    // Update the HTML badge (DOM updates still work in background tabs)
    const badge = document.getElementById("msg-badge");
    if (badge) {
      badge.textContent = AppState.currentCount;
      badge.style.display = AppState.currentCount > 0 ? 'inline-block' : 'none';
    }
  } catch (err) {
    console.error('Sync Error:', err);
  } finally {
    setTimeout(syncMessages, 4000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  fetch('/template/header.html')
    .then(res => res.text())
    .then(async(html) => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const tpl = wrapper.querySelector('template');
      if (!tpl) return console.error('No <template> found in header.html');

      // 1. Insert the HTML
      document.body.insertAdjacentHTML('afterbegin', tpl.innerHTML);
      startTitleEngine()
      syncMessages()

    //   // 2. Now you can get the element!
    //   const header = document.querySelector('header'); // Or use your specific class/ID
      
    //   // Initialize your header logic here (e.g., mobile menu listeners)
    //   header.addEventListener('click', (e) => {
    //     const link = e.target.closest('a');
    //     if (link) {
    //       e.preventDefault();

    //       const targetUrl = link.getAttribute('href');

    //       // Update the URL without reload
    //       window.history.pushState({}, '', targetUrl);
    //     }
    // });
    })
    .catch(err => console.error('Error loading header:', err));
});
