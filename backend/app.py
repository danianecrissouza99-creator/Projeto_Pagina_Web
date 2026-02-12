from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///medcei.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Requisito C.1: Diferenciação de Utilizadores (Tabela Corrigida)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(50), nullable=False) # Adicionamos esta linha que faltava!
    role = db.Column(db.String(20)) # 'admin' ou 'comum'

class Simulation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    params = db.Column(db.JSON)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

# Rota de Login (Movida para cima do "run")
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    # Procura por utilizador E password
    user = User.query.filter_by(username=data.get('username'), password=data.get('password')).first()
    if user:
        return jsonify({"username": user.username, "role": user.role})
    return jsonify({"error": "Utilizador ou senha incorretos"}), 404

# Criar a Base de Dados e os Utilizadores
with app.app_context():
    db.drop_all() 
    db.create_all()
    
    # Criar os utilizadores de teste
    admin = User(username='admin', password='123', role='admin')
    comum = User(username='user1', password='123', role='comum')
    
    db.session.add(admin)
    db.session.add(comum)
    db.session.commit()
    print("✅ Base de Dados MEDCEI pronta!")
    print("👉 Utilizadores criados: admin e user1 (senha: 123)")

if __name__ == '__main__':
    app.run(debug=True, port=5000)
    