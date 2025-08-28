from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Test the existing hash
existing_hash = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"

# Test common passwords
test_passwords = ["secret", "password", "admin", "123456", "test"]

print("Testing existing hash against common passwords:")
for password in test_passwords:
    result = pwd_context.verify(password, existing_hash)
    print(f"Password '{password}': {result}")

# Generate new hash for "secret"
new_hash = pwd_context.hash("secret")
print(f"\nNew hash for 'secret': {new_hash}")
print(f"Verify new hash: {pwd_context.verify('secret', new_hash)}")