async function saveAsEpub(BookData) {
        let content=BookData.chapter;
        let bookinfo=BookData.bookinfo;
        let zip = new JSZip();
        let bookTitle=bookinfo.title?.trim()||"Truyện";
        // 1️⃣ Thêm file `mimetype`
        zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

        // 2️⃣ Thêm metadata
        zip.file("META-INF/container.xml", `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
            <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
    </container>`);

        // 3️⃣ Tạo danh sách chương
        let chapters =[];
        content.forEach(e => {
            let fileName = `OEBPS/${e.id}.xhtml`;
            zip.file(fileName, `<?xml version="1.0" encoding="UTF-8"?>
        <html xmlns="http://www.w3.org/1999/xhtml">
            <head><title>${e.title}</title></head>
            <body><h2>${e.title}</h2><p>${e.content}</p></body>
        </html>`);
            chapters.push( { name:`${e.id}.xhtml`,id:e.id, title: e.title });
        });
        console.log(bookinfo.img)

        // 4️⃣ Thêm hình bìa
        let coverImage = "OEBPS/cover.jpg";
        try{
            let bookimg = await loadimg(bookinfo.img); // Chờ load ảnh hoàn tất
            zip.file(coverImage, bookimg.split(',')[1], { base64: true });
        }catch{
            zip.file(coverImage, null);
        }



        // 5️⃣ Cập nhật content.opf với bìa sách
        let opfContent = `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${bookTitle}</dc:title>
        <dc:creator>${bookinfo.author}</dc:creator>
        <dc:language>vi</dc:language>
        <meta name="cover" content="cover-image"/>
    </metadata>
    <manifest>
        <item id="cover-image" href="cover.jpg" media-type="image/jpeg"/>
        <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        ${chapters.map(ch => `<item id="ch${ch.id}" href="${ch.name}" media-type="application/xhtml+xml"/>`).join("\n")}
    </manifest>
    <spine>
        ${chapters.map(ch => `<itemref idref="ch${ch.id}"/>`).join("\n")}
    </spine>
</package>`;

        zip.file("OEBPS/content.opf", opfContent);
        // Thêm file `nav.xhtml`
        let navContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
    <nav epub:type="toc">
        <h1>Mục lục</h1>
        <ol>
            ${chapters.map(ch => `<li><a href="${ch.name}">${ch.title}</a></li>`).join("\n")}
        </ol>
    </nav>
</body>
</html>`;

        zip.file("OEBPS/nav.xhtml", navContent);



        // 5️⃣ Đóng gói và tải xuống
        let contentBlob = await zip.generateAsync({
            type: "blob",
            mimeType: "application/epub+zip",
            compression: "DEFLATE",
            compressionOptions: { level: 9 }
        });

        // Tải file EPUB về
        var link = document.createElement("a");
        link.href = URL.createObjectURL(contentBlob);
        link.download = `${bookTitle}.epub`; // Sử dụng bookTitle trong download
        link.click();
    }
