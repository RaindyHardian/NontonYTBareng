const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');

const socket = io();
console.log("<%= nama %>");
// on untuk nangkep emit 'message' dari server
socket.on('message', message => {
    console.log(message);
    tampilMessage(message);

    //scroll down
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// message submit
chatForm.addEventListener('submit', (e)=>{
    e.preventDefault();

    //get messsage text from html
    const msg = e.target.elements.msg.value;
    // ngirim ke server
    socket.emit('chatMessage', msg);
    // clear html input form
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

// nampilin message ke html
function tampilMessage(message){
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<p class="meta">Mary <span>9:15pm</span></p>
    <p class="text">
        ${message}
    </p>`;
    document.querySelector('.chat-messages').appendChild(div);
}