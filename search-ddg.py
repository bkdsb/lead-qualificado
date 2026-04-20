import urllib.request
import urllib.parse
from html.parser import HTMLParser

class MyParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_result = False
        self.text = []

    def handle_data(self, data):
        if data.strip():
            self.text.append(data.strip())

def search(query):
    url = 'https://html.duckduckgo.com/html/?q=' + urllib.parse.quote('"' + query + '"')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        parser = MyParser()
        parser.feed(html)
        print("\n".join(parser.text))
    except Exception as e:
        print(e)
search('Invalid JSON for postcard')
