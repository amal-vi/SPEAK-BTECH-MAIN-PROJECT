from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from extensions import mongo, bcrypt, socketio
import pymongo 
import sys 
import cloudinary

def create_app():
    """Application factory function"""
    app = Flask(__name__)
    app.config.from_object(Config)

    
    try:
        test_client = pymongo.MongoClient(app.config['MONGO_URI'])
        test_client.admin.command('ping')
        print("✅ MongoDB Connection Successful")
    except Exception as e:
        print("❌ FAILED TO CONNECT TO MONGODB")
        print(f"Error: {e}")
        print("---")
        print("Please check the following:")
        print("1. Is your MONGO_URI in .env correct? (Check user, pass, and db name)")
        print("2. Did you whitelist your IP (0.0.0.0/0) in Atlas Network Access?")
        print("3. Did you install 'dnspython' (pip install dnspython)?")
        print("---")
        sys.exit(1) 
    cloudinary.config(
        cloud_name=app.config['CLOUDINARY_CLOUD_NAME'],
        api_key=app.config['CLOUDINARY_API_KEY'],
        api_secret=app.config['CLOUDINARY_API_SECRET']
    )

    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    mongo.init_app(app)
    bcrypt.init_app(app)
    socketio.init_app(app, cors_allowed_origins=allowed_origins, supports_credentials=True)    
    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        allow_headers=["Authorization", "Content-Type"],
        supports_credentials=True
    )

    #Routes 
    from routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from routes.api_routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    from routes.socket_routes import register_socket_events
    register_socket_events()

    @app.route('/api/test')
    def test_route():
        return jsonify({"message": "Flask backend is running!"})

    return app

if __name__ == '__main__':
    app = create_app()
    socketio.run(app, debug=True, port=5000)