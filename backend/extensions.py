from flask_pymongo import PyMongo
from flask_bcrypt import Bcrypt
from flask_socketio import SocketIO 

mongo = PyMongo()
bcrypt = Bcrypt()
socketio = SocketIO()