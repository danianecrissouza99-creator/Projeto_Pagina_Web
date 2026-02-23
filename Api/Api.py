from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

app = Flask(__name__)

# Configurações
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'super-secret-key'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# ======================
# MODELOS
# ======================

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

class Simulation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# ======================
# REGISTO DE UTILIZADOR
# ======================

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username e password são obrigatórios"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Utilizador já existe"}), 400

    hashed_password = generate_password_hash(password)

    new_user = User(username=username, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Utilizador criado com sucesso"}), 201

# ======================
# LOGIN
# ======================

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Credenciais inválidas"}), 401

    access_token = create_access_token(identity=user.id)

    return jsonify({
        "message": "Login realizado com sucesso",
        "access_token": access_token
    }), 200

# ======================
# TOTAL DE SIMULAÇÕES
# ======================

@app.route('/simulations/total', methods=['GET'])
@jwt_required()
def total_simulations():
    total = Simulation.query.count()

    return jsonify({
        "total_simulations": total
    }), 200

# ======================
# SIMULAÇÕES POR UTILIZADOR
# ======================

@app.route('/simulations/user', methods=['GET'])
@jwt_required()
def user_simulations():
    user_id = get_jwt_identity()

    total = Simulation.query.filter_by(user_id=user_id).count()

    return jsonify({
        "user_id": user_id,
        "total_simulations": total
    }), 200

# ======================
# CRIAR SIMULAÇÃO (EXTRA)
# ======================

@app.route('/simulations', methods=['POST'])
@jwt_required()
def create_simulation():
    user_id = get_jwt_identity()

    simulation = Simulation(user_id=user_id)
    db.session.add(simulation)
    db.session.commit()

    return jsonify({"message": "Simulação criada com sucesso"}), 201


# ======================
# INICIALIZAR BASE DE DADOS
# ======================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)