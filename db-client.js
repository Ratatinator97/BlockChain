const path = require("path");
const getConfig = function getConfig() {
  if (process.argv.length < 5) {
    console.error("Pas assez d'arguments");
    console.info(`Usage : node ${process.argv[1]} <fileName>`);
    throw new Error("Need more args");
  } else {
    return require(path.resolve(process.argv[2]));
  }
}

command = process.argv[3];
field = process.argv[4];
valeur = process.argv[5];

const io = require('socket.io-client');

const socket = io(`http://localhost:${getConfig().port}`, {
  path: '/dbyb',
});

socket.on('connect', () => {
  console.log('Connexion établie');

  if(command == 'get'){
      socket.emit('get', field, (value) => {
      console.log(`get callback: ${value.value} ${value.timestamp}`);
      acc = value || 0;
      socket.emit('keys', (value) => {
        console.log(`keys callback: ${value}`);
        socket.close();
      });
    });
  }

  if(command == 'set'){
    socket.emit('set', field, valeur, (value) => {
      console.log(`set callback: ${value.value} ${value.timestamp}`);
        socket.emit('keys', (value) => {
          console.log(`keys callback: ${value}`);
          socket.close();
        });
    });
  }
});
