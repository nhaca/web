from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import json
import os
import logging  # Thêm import logging để ghi nhật ký

# Cấu hình logging cơ bản cho Flask
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)

USERS_FILE = 'users.json'
FILES_DIR = 'files'
MAX_DOWNLOADS = 3

# --- Khởi tạo File và Thư mục ---
# Đảm bảo thư mục FILES_DIR tồn tại
if not os.path.exists(FILES_DIR):
    os.makedirs(FILES_DIR)
    app.logger.info(f"Đã tạo thư mục: {FILES_DIR}")

# Tạo file USERS_FILE nếu chưa tồn tại
if not os.path.exists(USERS_FILE):
    # Khởi tạo với một mảng rỗng để đảm bảo JSON hợp lệ
    with open(USERS_FILE, 'w') as f:
        json.dump([], f)
    app.logger.info(f"Đã tạo file: {USERS_FILE}")


# --- Hàm Tải và Lưu người dùng ---
def load_users():
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        app.logger.warning(f"File {USERS_FILE} không tìm thấy. Trả về danh sách trống.")
        return []
    except json.JSONDecodeError:
        app.logger.error(f"Lỗi giải mã JSON từ file {USERS_FILE}. Trả về danh sách trống.")
        return []
    except Exception as e:
        app.logger.error(f"Lỗi không xác định khi tải người dùng từ {USERS_FILE}: {e}")
        return []


def save_users(users):
    try:
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f, indent=2)
        app.logger.info(f"Đã lưu người dùng vào {USERS_FILE}.")
    except Exception as e:
        app.logger.error(f"Lỗi khi lưu người dùng vào {USERS_FILE}: {e}")


# --- Routes của ứng dụng ---

@app.route('/')
def home():
    # Giả sử bạn có file templates/index.html
    return render_template('index.html')


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip().lower()
    password = data.get('password', '').strip()

    if not username or not password:
        app.logger.warning(f"Đăng nhập thất bại: Tên người dùng hoặc mật khẩu trống cho '{username}'.")
        return jsonify(
            {"status": "error", "message": "Tên đăng nhập và mật khẩu không được để trống."}), 400  # 400 Bad Request

    users = load_users()
    for user in users:
        # LƯU Ý QUAN TRỌNG VỀ BẢO MẬT:
        # Không nên lưu mật khẩu dạng văn bản thuần (plaintext) như thế này.
        # Hãy băm mật khẩu (hash passwords) bằng thư viện như `Werkzeug.security` (đã có sẵn trong Flask)
        # hoặc `Bcrypt`.
        # Ví dụ: if check_password_hash(user['password'], password):
        if user['username'].lower() == username and user['password'] == password:
            app.logger.info(f"Đăng nhập thành công cho người dùng: {username}")
            return jsonify({
                "status": "success",
                "unlimited": user.get("unlimited", False),
                "downloads": user.get("downloads", 0)
            })

    app.logger.warning(f"Đăng nhập thất bại: Tên đăng nhập hoặc mật khẩu không đúng cho '{username}'.")
    return jsonify({"status": "error", "message": "Tên đăng nhập hoặc mật khẩu không đúng"}), 401  # 401 Unauthorized


@app.route('/download_fla', methods=['GET'])
def download_fla():
    username = request.args.get('username', '').strip().lower()

    if not username:
        app.logger.warning("Yêu cầu tải xuống FLA không có tên người dùng.")
        return jsonify({"status": "error", "message": "Tên người dùng không được để trống."}), 400

    users = load_users()
    user_found = False
    for user in users:
        if user['username'].lower() == username:
            user_found = True
            if not user.get("unlimited", False):
                if user.get("downloads", 0) >= MAX_DOWNLOADS:
                    app.logger.warning(
                        f"Người dùng {username} đã vượt quá số lượt tải ({user.get('downloads', 0)}/{MAX_DOWNLOADS}).")
                    return jsonify(
                        {"status": "error", "message": "Bạn đã vượt quá số lượt tải cho phép!"}), 403  # 403 Forbidden

                user['downloads'] = user.get("downloads", 0) + 1
                save_users(users)
                app.logger.info(f"Người dùng {username} đã tải xuống. Lượt tải: {user['downloads']}/{MAX_DOWNLOADS}.")

            file_name = 'kiem_khach.fla'
            file_path = os.path.join(FILES_DIR, file_name)

            if not os.path.exists(file_path):
                app.logger.error(f"File {file_name} không tồn tại tại {file_path}.")
                return jsonify({"status": "error", "message": "File không tồn tại trên máy chủ."}), 404  # 404 Not Found

            app.logger.info(f"Đang gửi file {file_name} cho người dùng {username}.")
            return send_from_directory(FILES_DIR, file_name, as_attachment=True)

    if not user_found:
        app.logger.warning(f"Yêu cầu tải xuống FLA với tài khoản không hợp lệ: {username}.")
        return jsonify({"status": "error", "message": "Tài khoản không hợp lệ."}), 401  # 401 Unauthorized


# --- Khởi chạy ứng dụng ---
if __name__ == '__main__':
    # Heroku sẽ cung cấp cổng qua biến môi trường PORT.
    # Trong môi trường phát triển (local), nó sẽ mặc định là 5000.
    port = int(os.environ.get("PORT", 5000))

    # CHÚ Ý QUAN TRỌNG:
    # debug=True chỉ nên dùng cho môi trường phát triển (local).
    # KHÔNG BAO GIỜ để debug=True khi triển khai lên máy chủ công cộng (như Heroku)
    # vì nó có rủi ro bảo mật nghiêm trọng.
    # Khi triển khai Heroku, Flask sẽ tự động chạy trong chế độ production.
    # Do đó, bạn có thể xóa 'debug=True' hoặc đặt thành False khi đẩy lên production.
    app.run(debug=False, host='0.0.0.0', port=port)