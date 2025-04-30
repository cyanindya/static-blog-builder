let sections = Array.from(document.getElementsByTagName("section"));
let pageSections = sections.filter((section) => ('page' in section.dataset));
let spoilerSections = sections.filter((section) => ('spoiler' in section.dataset));
let spoilerButtonName = "&#x25BC; show/hide";

let currentIndex = -1;

async function getBlogMetadata() {
	fetch(window.location.pathname.includes('posts/') ? '../blog.json' : './blog.json')
		.then((response) => {
			if (!response.ok) {throw new Error(`HTTP error, status = ${response.status}`);}
			return response.json();
		})
		.then((data) => {
			const url = window.location.pathname;
			const uri = url.substring(url.lastIndexOf('posts/'));

			for (i = 0; i < data.posts.length; i++) {
				if (data.posts[i].uri === uri) {
					currentIndex = i
				}
			}

			// Set the previous/next if we're in a post
			if (currentIndex == 0) {
				if (data.posts.length > 1) {
					const prevButton = document.getElementById("post-prev");
					prevButton.innerHTML =`<a href="` + data.posts[currentIndex + 1].uri.slice(6) + `">&lt;&lt; Previous Post</a>`;
				}
			}
			else if (currentIndex == data.posts.length - 1) {
				if (data.posts.length > 1) {
					const nextButton = document.getElementById("post-next");
					nextButton.innerHTML =`<a href="` + data.posts[currentIndex - 1].uri.slice(6) + `">Next Post &gt;&gt;</a>`;
				}
			}
			else if (currentIndex > 0) {
				if (data.posts.length > 1) {
					const nextButton = document.getElementById("post-next");
					const prevButton = document.getElementById("post-prev");
					nextButton.innerHTML = `<a href="` + data.posts[currentIndex - 1].uri.slice(6) + `">Next Post &gt;&gt;</a>`;
					prevButton.innerHTML = `<a href="` + data.posts[currentIndex + 1].uri.slice(6) + `">&lt;&lt; Previous Post</a>`;
				}
			}
			else {}

			// Load the archives
			if (currentIndex >= 0) {
				let archive = document.getElementById("post-more");
				
				for (i=0;i < data.posts.slice(0, 5).length; i++) {
					archive.insertAdjacentHTML("beforeend",
						`<div class="post-more-entry">
							<div class="post-more-entry-date">` +
								data?.posts[i]?.date +
							`</div>
							<div class="post-more-entry-title">
								<a href="` + data?.posts[i]?.uri.slice(6) + `">` + data?.posts[i]?.title +`</a>
							</div>
						</div>`
					);
				}

				archive.insertAdjacentHTML("beforeend",
					`<div class="post-more-archive">
						<a href="../archive">All posts' archive &gt;&gt;</a>
					</div>`
				);

			}
			else {
				// const url = window.location.pathname;
				// const isArchive = url.includes('archive');
				// console.log(isArchive);

				// if (isArchive){
				// 	let archive = document.getElementById("post-more");

				// 	for (i=0;i < data.posts.length; i++) {
				// 		archive.insertAdjacentHTML("beforeend",
				// 			`<div class="post-more-entry">
				// 				<div class="post-more-entry-date">` +
				// 					data?.posts[i]?.date +
				// 				`</div>
				// 				<div class="post-more-entry-title">
				// 					<a href="` + data?.posts[i]?.uri + `">` + data?.posts[i]?.title +`</a>
				// 				</div>
				// 			</div>`
				// 		);
				// 	}
				// }
			}
		});
}
getBlogMetadata();


// If this post is paged, turn on pagination
let pageNav = document.getElementById("post-page-nav");
if (pageSections?.length > 1) {
	pageNav?.classList.remove("hidden");
	changePage(1);
}
else {
	pageNav?.classList.add("hidden");
}

// If this post contains spoilers/read more, add a button to show/hide the spoilered
// content
if (spoilerSections.length > 0) {
	spoilerSections?.forEach((section) => {
		section.insertAdjacentHTML("beforebegin",
			'<a class="spoiler-button" href="#" type="button" onclick="toggleSpoiler(\'' + String(section.dataset.spoiler) + `\')">${spoilerButtonName}</a>`);
	});
}

// The function to switch between pages
function changePage(pageNum) {
	let btns = Array.from(document.getElementsByClassName("pageId"));
	console.log(btns);

	btns.forEach((btn) => {
		if (btn.innerHTML.includes(pageNum)) btn.classList.add("active");
		else btn.classList.remove("active");
	});

	pageSections?.forEach((section) => {{
		if ('page' in section.dataset) {
			if (section?.dataset.page == String(pageNum)) {
				section?.classList.remove("hidden");
			}
			else {
				if (!section?.className.includes("hidden")) {
					section?.classList.add("hidden");
				}
			}
		}
	}});
}


function toggleSpoiler(spoilerTag) {
	let spoiler = spoilerSections?.find(sp => (sp.dataset.spoiler === spoilerTag));
	spoiler?.classList.toggle("hidden");
}
