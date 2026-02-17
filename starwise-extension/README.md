# StarWise Enhanced GitHub Lists Importer

A powerful browser extension that scrapes GitHub repository lists and imports them into StarWise with enhanced reliability and performance.

## 🚀 Enhanced Features

### **Improved Scraping Engine**
- **Multi-strategy extraction**: Uses container-based, link-based, and data-attribute extraction methods
- **Enhanced DOM detection**: Better handling of GitHub's changing page structure
- **Retry mechanisms**: Automatic retries with exponential backoff
- **Caching system**: Avoids redundant extractions and improves performance
- **Concurrent processing**: Handles multiple lists efficiently with limited concurrency

### **Better User Experience**
- **Real-time statistics**: Shows lists found, repositories count, and extraction time
- **Enhanced progress tracking**: Detailed progress with emoji indicators
- **Better error handling**: Clear error messages and recovery suggestions
- **Modern UI design**: Improved styling and visual feedback
- **Connection status**: Real-time StarWise backend connectivity checking

### **Robust Performance**
- **Processing locks**: Prevents multiple simultaneous extractions
- **Resource management**: Automatic cleanup of old cache and extraction data
- **Memory optimization**: Efficient handling of large datasets
- **Background processing**: Non-blocking operations with progress updates

### **Enhanced Reliability**
- **Multiple extraction methods**: Primary (chrome.scripting) and fallback (message passing)
- **Enhanced validation**: Better filtering of valid lists and repositories
- **Error recovery**: Graceful handling of network failures and DOM changes
- **Timeout management**: Configurable timeouts for different operations

## 📋 Installation

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `starwise-extension` folder
4. The extension will appear in your browser toolbar

## 🎯 Usage

### **Basic Import**
1. Navigate to your GitHub stars page (github.com/{username}/stars)
2. Click the StarWise extension icon
3. Ensure StarWise backend is running (`npm run dev`)
4. Click "Import GitHub Lists"
5. Wait for extraction and import completion

### **Individual List Import**
1. Navigate to a specific GitHub list page
2. Click the "Import to StarWise" button that appears in the header
3. The list will be extracted and imported immediately

### **Features Available**
- **Overview Page Import**: Extracts all visible lists from your stars overview
- **Individual List Import**: Precise extraction from specific list pages
- **Statistics Display**: Real-time feedback on extraction progress
- **Error Recovery**: Automatic retry for failed operations
- **Connection Checking**: Verify StarWise backend connectivity

## ⚙️ Configuration

### **Configuration**
The extension connects to standard ports by default, but you can configure custom URLs for production environments:

1. Click the extension icon
2. Click "⚙️ Settings"
3. Enter your **Backend URL** (e.g., `https://api.starwise.app` or `http://192.168.1.50:4000`)
4. Enter your **Frontend URL** (e.g., `https://starwise.app`)
5. Click "Save & Reconnect"

**Defaults:**
- Backend URL: `http://localhost:4000`
- Frontend URL: `http://localhost:5173`
- Main permissions have been updated to allow connections to any domain.

### **Environment Setup**
Ensure StarWise is running before using the extension:
```bash
# Backend
cd backend && npm start

# Frontend (in another terminal)
npm run dev
```

## 🔧 Technical Details

### **Architecture**
- **Content Script**: Enhanced DOM extraction with caching and retry logic
- **Background Service Worker**: Handles communication and resource management
- **Popup Interface**: User-friendly interface with real-time feedback

### **Extraction Methods**
1. **Container-based**: Scans structured repository containers
2. **Link-based**: Finds repository links in the DOM
3. **Data-attribute**: Extracts from repository metadata
4. **Background tab**: Opens individual list pages for extraction

### **Performance Optimizations**
- **Caching**: Stores extraction results to avoid reprocessing
- **Concurrency limiting**: Prevents overwhelming GitHub or StarWise
- **Memory management**: Automatic cleanup of old data
- **Lazy loading**: Only processes visible content initially

## 🐛 Troubleshooting

### **Common Issues**

**Extension not working on GitHub**
- Ensure you're on a GitHub stars page or list page
- Check that the extension is properly loaded
- Refresh the GitHub page after installing

**"StarWise not running" error**
- Verify StarWise backend is running on port 4000
- Check that you're logged into StarWise
- Try refreshing the connection using the refresh button

**"No lists found" message**
- Ensure you're on the correct GitHub page (stars overview or list page)
- Check that you actually have GitHub lists
- Try navigating to an individual list page

**Extraction fails or times out**
- Check your internet connection
- Try refreshing the GitHub page
- Use the individual list import as a fallback
- Check browser console for detailed error messages

### **Debug Mode**
Open browser console (F12) to see detailed extraction logs:
- `StarWise:` prefixed messages show extraction progress
- `Background:` messages show backend operations
- `Error:` messages indicate specific issues

## 🔄 Updates and Maintenance

### **Cache Management**
The extension automatically manages cache:
- Results are cached for 1 hour
- Old cache entries are automatically cleaned up
- Use the extension's cache clear function if needed

### **Performance Monitoring**
The extension tracks:
- Extraction success rate
- Average extraction time
- Memory usage
- Active extraction count

## 📚 API Integration

### **StarWise Backend**
The extension integrates with StarWise's `/api/lists/import-github` endpoint:
```javascript
POST /api/lists/import-github
Content-Type: application/json

{
  "lists": [
    {
      "name": "My List",
      "repos": ["owner/repo1", "owner/repo2"],
      "description": "List description"
    }
  ]
}
```

### **GitHub Integration**
- Reads repository data directly from GitHub pages
- Uses GitHub's DOM structure for extraction
- No API keys required for basic functionality

## 🎉 Recent Enhancements

- ✅ **Enhanced DOM extraction** with multiple strategies
- ✅ **Improved caching system** for better performance
- ✅ **Better error handling** and user feedback
- ✅ **Modern UI design** with statistics display
- ✅ **Concurrent processing** with resource management
- ✅ **Automatic retry mechanisms** for reliability
- ✅ **Enhanced connection checking** and status updates

## 🤝 Contributing

To contribute to the extension development:
1. Make changes to the extension files
2. Test thoroughly on different GitHub pages
3. Ensure backward compatibility
4. Update documentation as needed

## 📄 License

This extension is part of the StarWise project. See the main project license for details.