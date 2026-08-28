import {
    fetchCommunities,
    fetchCommunityCategoryIndex,
    fetchFriendCommunities,
    isCommunityCategory,
    isCommunitySort,
} from "#lib/community";
import { auth } from "#lib/state/user.svelte";
import type { CommunitySort, FriendCommunity } from "#lib/types";
import type { PageLoadEvent } from "./$types";

const FRIEND_PREVIEW = 6;

export async function load({ url, fetch }: PageLoadEvent) {
    const categoryParam = url.searchParams.get("category");
    const category = isCommunityCategory(categoryParam) ? categoryParam : null;

    const sortParam = url.searchParams.get("sort");
    const sort: CommunitySort = isCommunitySort(sortParam) ? sortParam : "created_at_desc";

    const [index, categories, friendCommunities] = await Promise.all([
        fetchCommunities({ category, sort }, fetch),
        fetchCommunityCategoryIndex(fetch),
        auth.user
            ? fetchFriendCommunities(null, FRIEND_PREVIEW, fetch)
                  .then((page) => page.results)
                  .catch(() => [] as FriendCommunity[])
            : Promise.resolve([] as FriendCommunity[]),
    ]);

    return {
        category,
        sort,
        communities: index.results,
        nextCursor: index.next_cursor,
        categories,
        friendCommunities,
    };
}
