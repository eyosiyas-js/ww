import urllib.request
import sys

def main():
    try:
        url = "https://raw.githubusercontent.com/deepinsight/insightface/master/examples/image/Tom_Hanks_54745.png"
        urllib.request.urlretrieve(url, "test_face.png")
        print("Downloaded test_face.png")
    except Exception as e:
        print(f"Failed to download image: {e}")

if __name__ == "__main__":
    main()
