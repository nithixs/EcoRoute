"""Retired random predictor. Use the Express /api/plan endpoint instead."""
from flask import Flask, jsonify
app = Flask(__name__)

@app.get('/predict')
def predict():
    return jsonify(error='Random predictions have been retired. Use /api/plan on the EcoRoute server for route-based estimates.'), 410

if __name__ == '__main__':
    app.run(port=8000)
