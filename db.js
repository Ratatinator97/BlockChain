const path = require("path");
const Server = require('socket.io');
const io_client = require('socket.io-client');
const crypto = require('crypto');

// Retourne l'empreinte de data.
const getHash = function getHash(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

const getConfig = function getConfig() {
  if (process.argv.length < 3) {
    console.error("Vous devez indiquer le fichier de configuration");
    console.info(`Usage : node ${process.argv[1]} <fileName>`);
    throw new Error("Need config filename");
  } else {
    return require(path.resolve(process.argv[2]));
  }
}
const extractHorodatage = function(database) {
  return Object.keys(database).reduce(function(result, key) {
    result[key] = {
      timestamp: database[key].timestamp
    };
    return result;
  }, {});
};

const actualisationDB = function(pairs) {
  pairs.map((socket_elem) => {
    console.log("On demande les clefs");
    socket_elem.emit('keys', (response) => {
      Object.keys(response).map((key) => {
        if(key in db){
          if(key.timestamp < db[key].timestamp){
            db[key] = {
              value: key.value,
              timestamp: key.timestamp
            };
          }
        } else {
          socket_elem.emit('get', key, (val) => {
            db[key] = {
              value: val.value,
              timestamp: val.timestamp
            };
          });
        }
      });
    });
  });
}

const config = getConfig();

console.log("PORT: ", config.port);

const PORT = config.port;

const io = new Server(PORT, {
  path: '/dbyb',
  serveClient: false,
});

const socket_pairs = config.pairs.map((port)=> {
  return io_client(`http://localhost:${port}`, {
    path: '/dbyb',
  });
});

console.log(`Serveur lancé sur le port ${PORT}.`);

actualisationDB(socket_pairs);
const db = Object.create(null);
setInterval(() => {
  actualisationDB(socket_pairs);
}, 10000); // 10000 millisecondes = 10 secondes



io.on('connect', (socket) => {
  console.log('Nouvelle connexion');

  socket.on('get', function(field, callback){
    console.log(`get ${field}: ${db[field]}`);
    callback(db[field]);
  });

  socket.on('set', function(field, value, callback){
    if(value.timestamp){
      console.log("On recoit un set avec un timestamp");
      if(!(field in db)){
        console.log("On ne connait pas le champ");
        db[field] = {
          value: value.value,
          timestamp: value.timestamp
        };
        callback(true);
      } else {
        console.log(`Comparateur de timestamp : ${db[field].timestamp} and ${value.timestamp}`);
        if(db[field].timestamp < value.timestamp) {
          console.log("On recoit un set avec un timestamp superieur au notre, on jette");
          console.log(`set error : Field ${field} exists.`);
          //db[field] = value;
          callback(false);
        } else {
          console.log("On recoit un set avec un timestamp inferieur au notre, on garde");
          db[field] = {
            value: value.value,
            timestamp: value.timestamp
          };
          callback(true);
        }
      }
    } else {
      if(field in db){
        console.log("On recoit une ancienne valeur du client");
        console.log(`set error : Field ${field} exists.`);
        //db[field] = value;
        callback(false);
      } else {
        console.log("On recoit une nouvelle valeur du client");
        console.log(`set ${field} : ${value}`);
        db[field] = {
          value: value,
          timestamp: new Date()
        };
        callback(true);
        setTimeout(() => {
          socket_pairs.map((element) => {
            element.emit('set',field, db[field], (response) => {
              console.log(`la paired DB a repondu: ${response}`);
            });
          });
        }, 5000);
      }
    }
  });

  socket.on('keys', function(callback){
    if(db){
      callback(extractHorodatage(db));
    }
  })
});

