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
const db = require('./config/database');
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
// config database
db.authenticate().then(() => {
  console.log('Connected to MySQL.');
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});
// Use the session middleware
app.use(session({ secret: 'keyboard cat'}))


app.get('/', (req,res)=>{
    res.render('index');
});

app.post('/postCreateRoom',(req,res)=>{
  db.query("INSERT INTO room(id_share, yt_link) VALUES (:id_share,:yt_link);",{
    replacements:{
      id_share : req.body.id_share,
      yt_link : req.body.yt_link
    },
    type: db.QueryTypes.INSERT
  }).then(()=>{
    db.query("INSERT INTO user_room(id_share, username) VALUES (:id_share,:username);",{
      replacements:{
        id_share : req.body.id_share,
        username : req.body.username
      },
      type: db.QueryTypes.INSERT
    }).then(record=>{
      req.session.id_user_room = record[0];
      req.session.id_share = req.body.id_share;
      req.session.username = req.body.username;  
      req.session.yt_link = req.body.yt_link;
      req.session.userStatus = 'create';
      res.redirect('/room')
    });
  });
});

app.post('/postJoinRoom',(req,res)=>{
  db.query("SELECT * FROM room WHERE id_share=:id_share", { 
    replacements:{
      id_share : req.body.id_share,
    },
    type: db.QueryTypes.SELECT 
  }).then(users=>{
    if(users!=null){
      db.query("INSERT INTO user_room(id_share, username) VALUES (:id_share,:username);",{
        replacements:{
          id_share : req.body.id_share,
          username : req.body.username
        },
        type: db.QueryTypes.INSERT
      }).then(record=>{
        req.session.id_user_room = record[0];
        req.session.id_share = req.body.id_share;
        req.session.username = req.body.username;
        req.session.yt_link = users[0].yt_link;   
        req.session.roomStatus = 'join';
        res.redirect('/room')
      });
    }else{
      res.json(users)
    }
  })
});

app.get('/sess',function(req,res){
  if(req.session.id_share!=null){
    // res.setHeader('Content-Type', 'text/html')
    // res.write('<p>views: ' + req.session.id_share+' dan '+req.session.yt_link + '</p>')
    // res.end()
    res.json(req.session)
  }else{
    res.setHeader('Content-Type', 'text/html')
    res.write('No Session')
    res.end()
  }
});

app.get('/logout',function(req,res){
  req.session.destroy(function(err) {
    res.redirect('/sess')
  })
});
app.get('/dataUser',(req,res)=>{
  var user = {
    id_user_room : req.session.id_user_room,
    id_share : req.session.id_share,
    username: req.session.username,  
    yt_link : req.session.yt_link
  }
  res.json(user)
})
app.get('/room', (req,res)=>{
  io.on('connection', socket=>{
    console.log("user from roompage has connected");
    //generate unique id share/room id
    socket.on('genId', ()=>{
        var id = uuid();
        console.log("room id: "+id);
        socket.emit('genId', id );
    });
    
    socket.on('joinRoom',({id_user_room , username,roomId})=>{
      // update online menjadi 1 pada record user_room
      db.query("UPDATE user_room SET online=:online,socketid=:socketid WHERE id_user_room=:id", { 
        replacements:{
          id: id_user_room,
          socketid: socket.id,
          online : 1,
        },
        type: db.QueryTypes.UPDATE 
      })
      
      userJoin(socket.id, username, roomId)
      // join ke socket pada id_share/roomId
      socket.join(roomId);
      // Broadcast when a user connects
      socket.broadcast.to(roomId).emit(
        'message',
        'Ada user yang masuk'
      );
      // ambil semua user yang aktif pada room
      db.query("SELECT * FROM user_room WHERE id_share=:id_share AND online=:online", { 
        replacements:{
          id_share: roomId,
          online : '1',
        },
        type: db.QueryTypes.SELECT 
      }).then(users=>{
        // Send users and room info
        io.to(roomId).emit('roomUsers', {
          // room: roomId,
          users: users
        })
      })  
    });
    
    socket.on('seekSec', ({status, seek})=>{     
        // const user = getCurrentUser(socket.id);
        // ambil semua user yang aktif pada room
        socket.broadcast
          .to(req.session.id_share)
          .emit('seekSec',{status,seek});
    })
    socket.on('changeUrl', x=>{     
        const user = getCurrentUser(socket.id);
        socket.broadcast
          .to(req.session.id_share)
          .emit('seekSec',x);
    })
    socket.on('mouseDrawing', data=>{
        // console.log(data);
        const user = getCurrentUser(socket.id);
        socket.broadcast
          .to(req.session.id_share)
          .emit('mouseDrawing',data);
    })
    socket.on('clearDrawing', clearD=>{
        // console.log(data);
        const user = getCurrentUser(socket.id);
        socket.broadcast
          .to(req.session.id_share)
          .emit('clearDrawing',clearD);
    })

    // Runs when client disconnects
    socket.on('disconnect', () => {
      // update online menjadi 1 pada record user_room
      db.query("UPDATE user_room SET online=:online WHERE socketid=:id", { 
        replacements:{
          id: socket.id,
          online : 0,
        },
        type: db.QueryTypes.UPDATE 
      })
      // ambil semua user yang aktif pada room
      db.query("SELECT * FROM user_room WHERE id_share=:id_share AND online=:online", { 
        replacements:{
          id_share: req.session.id_share,
          online : '1',
        },
        type: db.QueryTypes.SELECT 
      }).then(users=>{
        if (users) {
          io.to(req.session.id_share).emit(
              'message',
              'Ada user yg keluar'
          );

          // Send users and room info
          io.to(req.session.id_share).emit('roomUsers', {
              // room: req.session.id_share,
              users: users
          });
        }
      }) 
    });
  });
  res.render('room');
})



io.on('connection', socket=>{
    console.log("user from homepage has connected");
    //generate unique id share/room id
    socket.on('genId', ()=>{
        var id = uuid();
        console.log("room id: "+id);
        socket.emit('genId', id );
    });
  });
    
//     socket.on('joinRoom',({id_user_room , username,roomId})=>{
//       // update online menjadi 1 pada record user_room
//       db.query("UPDATE user_room SET online=:online,socketid=:socketid WHERE id_user_room=:id", { 
//         replacements:{
//           id: id_user_room,
//           socketid: socket.id,
//           online : 1,
//         },
//         type: db.QueryTypes.UPDATE 
//       })
      
//       userJoin(socket.id, username, roomId)
//       // join ke socket pada id_share/roomId
//       socket.join(roomId);
//       // Broadcast when a user connects
//       socket.broadcast.to(roomId).emit(
//         'message',
//         'Ada user yang masuk'
//       );
//       // ambil semua user yang aktif pada room
//       db.query("SELECT * FROM user_room WHERE id_share=:id_share AND online=:online", { 
//         replacements:{
//           id_share: roomId,
//           online : '1',
//         },
//         type: db.QueryTypes.SELECT 
//       }).then(users=>{
//         // Send users and room info
//         io.to(roomId).emit('roomUsers', {
//           // room: roomId,
//           users: users
//         })
//       })  
//     });
    
//     // socket.on('checkValidRoom', roomId => {
//     //     console.log(roomId);
//     //     ans = checkRoom(roomId);
//     //     console.log("ADA? "+ ans);
//     //     socket.emit('checkValidRoom', ans);
//     // });

//     // socket.on('joinRoom', ({ username, roomId }) => {
//     //     var room = roomId;
//     //     console.log(username)
//     //     console.log(roomId)
//     //     const user = userJoin(socket.id, username, room);
    
//     //     socket.join(user.room);
    
//     //     // Broadcast when a user connects
//     //     socket.broadcast
//     //       .to(user.room)
//     //       .emit(
//     //         'message',
//     //         'Ada user yang masuk'
//     //       );
    
//     //     // Send users and room info
//     //     io.to(user.room).emit('roomUsers', {
//     //       room: user.room,
//     //       users: getRoomUsers(user.room)
//     //     });
//     // });

//     socket.on('seekSec', ({status, seek})=>{     
//         const user = getCurrentUser(socket.id);
//         socket.broadcast
//           .to(user.room)
//           .emit('seekSec',{status,seek});
//     })
//     socket.on('changeUrl', x=>{     
//         const user = getCurrentUser(socket.id);
//         socket.broadcast
//           .to(user.room)
//           .emit('seekSec',x);
//     })
//     socket.on('mouseDrawing', data=>{
//         // console.log(data);
//         const user = getCurrentUser(socket.id);
//         socket.broadcast
//           .to(user.room)
//           .emit('mouseDrawing',data);
//     })
//     socket.on('clearDrawing', clearD=>{
//         // console.log(data);
//         const user = getCurrentUser(socket.id);
//         socket.broadcast
//           .to(user.room)
//           .emit('clearDrawing',clearD);
//     })
//     // Runs when client disconnects
//     socket.on('disconnect', () => {
//       // update online menjadi 1 pada record user_room
//       db.query("UPDATE user_room SET online=:online WHERE socketid=:id", { 
//         replacements:{
//           id: socket.id,
//           online : 0,
//         },
//         type: db.QueryTypes.UPDATE 
//       })
//       const user = userLeave(socket.id);

//       if (user) {
//           io.to(user.room).emit(
//               'message',
//               'Ada user yg keluar'
//           );

//           // Send users and room info
//           io.to(user.room).emit('roomUsers', {
//               room: user.room,
//               users: getRoomUsers(user.room)
//           });
//       }
//     });
// });
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