/*
 * Copyright 2022 m-alorda
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fetch_user_id = async (username) => {
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

const fetch_not_followed_and_following_back = async (username) => {
  const fetch_usernames = async (
    user_id,
    endpoint_hash,
    user_data_path,
    after
  ) => {
    const url_params = {
      id: user_id,
      include_reel: true,
      fetch_mutual: true,
      first: 50, // Maximum is 50
      after: after === undefined ? null : after,
    };
    const request_url =
      "https://www.instagram.com/graphql/query/" +
      `?query_hash=${endpoint_hash}` +
      `&variables=${encodeURIComponent(JSON.stringify(url_params))}`;
    console.log(
      `Fetching ${user_data_path} of user ${user_id} from endpoint ${endpoint_hash}`
    );
    return fetch(request_url)
      .then((res) => res.json())
      .then((res) => res.data.user[user_data_path])
      .then((data) => {
        return {
          has_next: data.page_info.has_next_page,
          after: data.page_info.end_cursor,
          fetched_usernames: data.edges.map((element) => element.node.username),
        };
      });
  };
  const fetch_all_usernames = async (list_config, user_id) => {
    const result_list = [];
    let after = null;
    let has_next = true;
    while (has_next) {
      const result = await fetch_usernames(
        user_id,
        list_config.hash,
        list_config.path,
        after
      );
      has_next = result.has_next;
      after = result.after;
      result_list.push(...result.fetched_usernames);
    }
    return result_list;
  };
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

  const user_id = await fetch_user_id(username);
  console.log("Requesting followers");
  const followers_task = fetch_all_usernames(config.followers, user_id);
  console.log("Requesting following");
  const following_task = fetch_all_usernames(config.following, user_id);

  const followers = await followers_task;
  const following = await following_task;

  const not_followed_back = following.filter(
    (user) => followers.indexOf(user) < 0
  );
  const not_following_back = followers.filter(
    (user) => following.indexOf(user) < 0
  );
  return Promise.resolve({
    not_followed_back: not_followed_back,
    not_following_back: not_following_back,
  });
};

(async () => {
  const prompt_valid_username = async () => {
    let username = prompt("Please, enter your username");
    while ((await fetch_user_id(username)) == null) {
      username = prompt(
        `The given username was not found (@${username}). Please, enter another one`
      );
    }
    return username;
  };

  const username = await prompt_valid_username();
  const data = await fetch_not_followed_and_following_back(username);
  console.log(
    `Not followed back (${data.not_followed_back.length}): ${data.not_followed_back}`
  );
  console.log(
    `Not following back (${data.not_following_back.length}): ${data.not_following_back}`
  );
})();
