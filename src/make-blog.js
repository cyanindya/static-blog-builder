const fs = require('fs');
const path = require('path');
const hbs = require('handlebars');

const blogSourcePath = path.resolve(path.join(__dirname, 'blog/'));
const blogDistDir = path.resolve(path.join(__dirname, '../dist/blog/'));
const partialsDir = path.resolve(path.join(blogSourcePath, 'partials'));
const blogPostSourceDir = path.resolve(path.join(blogSourcePath, 'posts/'));
const blogPostDistDir = path.resolve(path.join(blogDistDir, 'posts/'));

const mainTemplatePath = path.resolve(path.join(blogSourcePath, 'template-blog-main.hbs'));

const author = "Author";
const blogTitle = "My Blog";
const description = "My Personal Blog";
const address = ""; // put your website address here
const recentPostCountLimit = 5
let posts = []

let blogJsonOutput = {
	author: author,
	title: blogTitle,
}

/* 
	The general process is:
	- compile each post
	- compile archive

	For compiling the posts, the process is as follows:
	- go through the posts subdirectory and list every file there
	- for each file, get the title and post date from file name, then the contents from the file itself
	- store the data of each post in temporary dictionary
*/

// Initialize handlebar helper functions first
// credits: https://stackoverflow.com/a/29889710
hbs.registerHelper('limit', function (arr, limit) {
	if (!Array.isArray(arr)) { return []; }
	return arr.slice(0, limit);
  });
hbs.registerHelper('divide', (op1, op2) => {
	return Math.floor(op1/op2) + 1;
}); 
hbs.registerHelper("compare", (operand_1, operator, operand_2, options) => {
	let operators = {                     //  {{#when <operand1> 'eq' <operand2>}}
		'==': (l,r) => l == r,              //  {{/when}}
		'!=': (l,r) => l != r,
		'>': (l,r) => (+l) > (+r),                        // {{#when var1 'eq' var2}}
		'>=': (l,r) => ((+l) > (+r)) || (l == r),        //               eq
		'<': (l,r) => (+l) < (+r),                        // {{else when var1 'gt' var2}}
		'<=': (l,r) => ((+l) < (+r)) || (l == r),        //               gt
		'||': (l,r) => l || r,                             // {{else}}
		'&&': (l,r) => l && r,                            //               lt
		'%': (l,r) => (l % r) === 0                        // {{/when}}
	}
	let result = operators[operator](operand_1,operand_2);
	if(result) return options.fn(this); 
	return options.inverse(this);       
  });


// Main execution routine, where we build all sites
console.log("Compiling the handlebars files into static pages...");

let postFiles = fs.readdirSync(blogPostSourceDir);
postFiles.sort((a, b) => {
	if (a < b) return 1;
	if (a > b) return -1;
	return 0;
});
const dateFormat = /\d{4}\-\d{2}\-\d{2}\-/;
postFiles.forEach((postFile) => {
	let hasDate = dateFormat.test(postFile.slice(0, 11));
	let postData = {
		title: blogTitle,
		post : {author: author},
		// posts: [],
		// postlimit: recentPostCountLimit
	};

	if (hasDate) {
		let dt = dateFormat.exec(postFile.slice(0, 11))[0]
			.replace(/-/g," ").trimEnd().split(" ");
		postData.post.date = dt.join('/');
		postData.post.rawDate = dt.join('-');
		// console.log(postData.post.date);

		// Extract post title. We can replace it with post title
		// from comments later
		let dirtyPostTitle = (postFile.endsWith('.html')
			? postFile.slice(11, -5)
			: postFile.slice(11, -4)
		); // last 5 is the ".html"
		postData.post.title = decodeURI(dirtyPostTitle.replace('-', " "));
		// console.log(postData.post.title);

	} else {
		console.log("The post file has no specified date format and will use" +
			" today's date. Please be mindful this may cause issues in rendering" +
			" the pages."
		);

		// TODO
	}

	// Extract HTML code of the post content
	let postContentRaw = fs.readFileSync(
		path.resolve(path.join(blogPostSourceDir, postFile)),
		'utf-8'
	);

	// If there is custom title in first line of comment, use it.
	// FIXME: still bugged
	const commentRegex = /(?:<!--\s*)(.*)(?:\s*-->)/;
	const firstLine = postContentRaw.split("\n")[0];
	const titleMatch = firstLine.match(commentRegex);
	if (titleMatch) postData.post.title = titleMatch[1];

	// Use the second line to detect link to the Bluesky post
	const bskyRegex = /(?:<!--\s*)(https:\/\/bsky\.app\/profile\/.*\/post\/.*)(?:\s*-->)/;
	const secondLine = postContentRaw.split("\n")[1];
	const bskyThreadMatch = secondLine.match(bskyRegex);
	if (bskyThreadMatch) postData.post.bskyUri = bskyThreadMatch[1];

	// console.log(postContent);

	// Page break detection -- replace the <!--break--> with page sections
	let pbCount = 1;
	let postContent = postContentRaw.replace(
		/<!--\s*break\s*-->/g,
		(match, _) => {
			pbCount += 1;
			return `</section>
			<section id="page-` + pbCount + `" data-page="` + pbCount + `">`	
		}
	);

	postData.post.content = postContent;

	// check if post is comprised of multiple pages (for rendering page nav)
	const dataPageFinder = /(?:data-page=\")(\d)(?:\")/g;
	let secs = [];
	var mat;
	do {
		mat = dataPageFinder.exec(postContent);
		if (mat) {
			secs.push({page: mat[1]});
		}
	} while (mat);
	if (secs) {
		postData.post.pages = secs;
	}
	
	// Format the file name
	const wordSearcher = /\w+/g;
	let blogPostFileName = [
		String(postData.post.rawDate),
		String(postData.post.title).toLowerCase().match(wordSearcher).join('-'),
	].join('-');
	postData.post.uri = 'posts/' + blogPostFileName;

	
	// Write the data for public json file
	posts.push({
		title: postData.post.title,
		author: author,
		date: postData.post.rawDate,
		uri: postData.post.uri,
		// excerpt: postContentRaw.replace(/<\/?[^>]+\/?(>)/g, "").substring(0, 100)
		excerpt: () => {
			let match = /<!--\s*break\s*-->/g.exec(postContentRaw);
			if (match) return postContentRaw.substring(0, match.index).replace(/<!--.*-->/g, '');
			return postContentRaw.replace(/<!--.*-->/g, '');
		}

	});

	createPage(postData);
});


blogJsonOutput.posts = posts;
fs.writeFileSync(
	path.resolve(path.join(blogDistDir, 'blog.json')),
	JSON.stringify(blogJsonOutput),
	'utf-8',
	(err) => {if (err) console.log(err);}
);

createPage({ // Archives
	title: blogTitle,
	posts: posts,
}, 'archive');
createPage({ // Index page
	title: blogTitle,
	posts: posts,
	index: 'true'
});

createRssFeed();


function createPage(data, outFileName='index') {
	// Initialize rendering engine and necessary partials
	let mainTemplateContent = fs.readFileSync(mainTemplatePath, "utf-8");
	let renderPage = hbs.compile(mainTemplateContent);
	
	let partialsFileList = fs.readdirSync(partialsDir);
	partialsFileList.forEach((file) => {
		hbs.registerPartial(
			file.replace(".hbs", ""),
			fs.readFileSync(path.join(partialsDir, file), "utf-8")
		);
	});

	let htmlFileContent = renderPage(data);

	// Save the resulting file in the distribution folder
	if (!fs.existsSync(blogDistDir)) {
		fs.mkdirSync(blogDistDir);
	}

	// console.log('post' in data);
	if ('post' in data) {
		if (!fs.existsSync(blogPostDistDir)) {
			fs.mkdirSync(blogPostDistDir);
		}
	}
	
	if ('post' in data) {
		fs.writeFile(
			path.resolve(path.join(blogPostDistDir, data.post.uri.slice(6) + ".html")),
			htmlFileContent,
			"utf-8",
			err => {
				if (err) console.log(err);
				else console.log("File " + data.post.uri.slice(6) + ".html written successfully.");
			}
		);
	}
	else {
		fs.writeFile(
			path.resolve(path.join(blogDistDir, outFileName + ".html")),
			htmlFileContent,
			"utf-8",
			err => {
				if (err) console.log(err);
				else console.log("File " + outFileName + ".html written successfully.");
			}
		);
	}
	
}

function createRssFeed() {
	const rssHeader = `<?xml version="1.0" encoding="utf-8"?>
	<rss version="2.0">
	<channel>
		<title>${blogTitle}</title>
		<link>${address}</link>
		<description>${description}</description>
	`;
	const rssFooter = `
	</channel>
</rss>`;

	let feedContent = '';
	for (i=0; i < posts.length; i++) {
		let feedString = `<item>
			<title>${posts[i].title}</title>
			<link>` + address + posts[i].uri + `</link>
			<pubDate>${new Date(posts[i].date)}</pubDate>
			<guid>` + (posts.length -1 - i) + `</guid>
			<description>${posts[i].excerpt()}</description>
		</item>
`;
		feedContent = feedContent + feedString;
	}

	let feed = rssHeader + feedContent + rssFooter;
	feed = feed.replace('\t', '');
	// console.log(feed);

	// Save the RSS feed
	if (!fs.existsSync(blogDistDir)) {
		fs.mkdirSync(blogDistDir);
	}
	fs.writeFile(
		path.resolve(path.join(blogDistDir, "rss.xml")),
		feed,
		"utf-8",
		err => {
			if (err) console.log(err);
			else console.log("File rss.xml written successfully.");
		}
	);
}