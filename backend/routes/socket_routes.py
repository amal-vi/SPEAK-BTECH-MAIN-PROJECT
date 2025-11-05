from flask import request
from flask_socketio import emit, join_room, leave_room
from extensions import socketio, mongo  

online_users = {}

def register_socket_events():
    
    @socketio.on('connect')
    def handle_connect():
        print(f"Client connected with socket_id: {request.sid}")

    @socketio.on('user_online')
    def handle_user_online(user_data):
        user_id = user_data.get('user_id')
        if user_id:
            user_data['socket_id'] = request.sid
            online_users[user_id] = user_data
            
            print(f"User {user_id} ({user_data.get('name')}) is online.")
            
            emit('update_online_users', list(online_users.values()), broadcast=True)

    @socketio.on('disconnect')
    def handle_disconnect():
        user_id_to_remove = None
        for user_id, user_data in online_users.items():
            if user_data['socket_id'] == request.sid:
                user_id_to_remove = user_id
                break
        
        if user_id_to_remove:
            del online_users[user_id_to_remove]
            print(f"User {user_id_to_remove} disconnected.")
            
            emit('update_online_users', list(online_users.values()), broadcast=True)

        print(f"Client disconnected: {request.sid}")

    #  WebRTC signaling events
  