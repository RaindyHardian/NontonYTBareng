const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Sequelize = require('sequelize')
const ejs = require('ejs');
const bodyParser = require('body-parser');
var session = require('express-session');
const { uuid } = require('uuidv4');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers,
    checkRoom
  } = require('./utils/users');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
// set static folder
app.use(express.static(path.join(__dirname,'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.get('/', (req,res)=>{
    res.render('index');
});
app.get('/room',(req,res)=>{
    res.render('room');
});

io.on('connection', socket=>{
    console.log("user has connected");
    socket.on('genId', ()=>{
        var id = uuid();
        console.log("room id: "+id);
        socket.emit('genId', id );
    });
    // socket.on('checkValidRoom', roomId => {
    //     console.log(roomId);
    //     ans = checkRoom(roomId);
    //     console.log("ADA? "+ ans);
    //     socket.emit('checkValidRoom', ans);
    // });
    socket.on('joinRoom', ({ username, roomId }) => {
        var room = roomId;
        const user = userJoin(socket.id, username, room);
    
        socket.join(user.room);
    
        // Broadcast when a user connects
        socket.broadcast
          .to(user.room)
          .emit(
            'message',
            'Ada user yang masuk'
          );
    
        // Send users and room info
        io.to(user.room).emit('roomUsers', {
          room: user.room,
          users: getRoomUsers(user.room)
        });
    });

    socket.on('seekSec', ({status, seek})=>{     
        const user = getCurrentUser(socket.id);
        socket.broadcast
          .to(user.room)
          .emit('seekSec',{status,seek});
    })
    socket.on('changeUrl', x=>{     
        const user = getCurrentUser(socket.id);
        socket.broadcast
          .to(user.room)
          .emit('seekSec',x);
    })
    socket.on('mouseDrawing', data=>{
        // console.log(data);
        const user = getCurrentUser(socket.id);
        socket.broadcast
          .to(user.room)
          .emit('mouseDrawing',data);
    })
    socket.on('clearDrawing', clearD=>{
        // console.log(data);
        const user = getCurrentUser(socket.id);
        socket.broadcast
          .to(user.room)
          .emit('clearDrawing',clearD);
    })
    // Runs when client disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit(
                'message',
                'Ada user yg keluar'
            );

            // Send users and room info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });
});
// // Run when client connect
// io.on('connection', socket => {
//     // KAMUS SOCKET IO : socket.on = mendapatkan, socket.emit = mengirim

//     // welcome current user
//     socket.emit('message', 'Welcome to ChatCord');

//     // broadcast when user connect
//     socket.broadcast.emit('message', 'A user has joined the chat');

//     // dapetin/listen for 'chatMessage' dari client
//     socket.on('chatMessage', msg => {
//         io.emit('message', msg);
//     });

//     // runs when client disonnect
//     socket.on('disconnect', ()=>{
//         io.emit('message', 'A user has left the chat');
//     });
// });

const PORT = 3000 || process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));