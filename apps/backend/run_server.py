import uvicorn
import os
import sys

# Add the current directory to sys.path so 'app' can be found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app

if __name__ == "__main__":
    # Get port from environment or default to 8000
    port = int(os.environ.get("PORT", 8000))
    # Run uvicorn
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
