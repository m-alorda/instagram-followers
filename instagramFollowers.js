const config = {
  followers: {
    hash: "c76146de99bb02f6415203be841dd25a",
    path: "edge_followed_by",
  },
  following: {
    hash: "d04b0a864b4b54837c0d870b0e77e076",
    path: "edge_follow",
  },
};

const get_user_id = async (username) => {
  console.log(`Fetching user id for @${username}`);
  return fetch(
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
    {
      headers: {
        "X-IG-App-ID": 936619743392459,
      },
    }
  )
    .then((res) => {
      if (!res.ok) {
        throw new Error("Unexpected network error");
      }
      return res.json();
    })
    .then((res) => {
      const user_id = res.data.user.id;
      console.log(`Found user id is ${user_id}`);
      return user_id;
    })
    .catch(() => {
      console.log("User id not found");
      return null;
    });
};

const get_list = async (list_config, user_id) => {
  const result_list = [];
  let after = null;
  let has_next = true;
  const url_params = {
    id: user_id,
    include_reel: true,
    fetch_mutual: true,
    first: 50,
  };
  while (has_next) {
    url_params.after = after;
    const request_url =
      "https://www.instagram.com/graphql/query/" +
      `?query_hash=${list_config.hash}` +
      `&variables=${encodeURIComponent(JSON.stringify(url_params))}`;
    console.log("Fetching data");
    await fetch(request_url)
      .then((res) => res.json())
      .then((res) => res.data.user[list_config.path])
      .then((data) => {
        has_next = data.page_info.has_next_page;
        after = data.page_info.end_cursor;
        const recv_usernames = data.edges.map(
          (element) => element.node.username
        );
        result_list.push(...recv_usernames);
      });
  }
  return result_list;
};

const prompt_valid_username = async () => {
  let username = prompt("Please, enter your username");
  while ((await get_user_id(username)) == null) {
    username = prompt(
      `The given username was not found (@${username}). Please, enter another one`
    );
  }
  return username;
};

(async () => {
  const username = await prompt_valid_username();
  const user_id = await get_user_id(username);
  console.log("Requesting followers");
  const followers_task = get_list(config.followers, user_id);
  console.log("Requesting following");
  const following_task = get_list(config.following, user_id);

  const followers = await followers_task;
  const following = await following_task;

  not_followed_back = following.filter((user) => followers.indexOf(user) < 0);
  not_following_back = followers.filter((user) => following.indexOf(user) < 0);
  console.log(
    `Not followed back (${not_followed_back.length}): ${not_followed_back}`
  );
  console.log(
    `Not following back (${not_following_back.length}): ${not_following_back}`
  );
})();
