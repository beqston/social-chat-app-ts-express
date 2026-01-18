document.addEventListener('DOMContentLoaded', () => {
  fetch('/template/header.html')
    .then(res => res.text())
    .then(html => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const tpl = wrapper.querySelector('template');
      
      if (!tpl) return console.error('No <template> found in header.html');

      // 1. Insert the HTML
      document.body.insertAdjacentHTML('afterbegin', tpl.innerHTML);

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