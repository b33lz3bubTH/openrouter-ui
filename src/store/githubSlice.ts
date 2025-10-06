import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface GitHubUser {
  login: string;
  name: string;
  bio: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
}

interface GitHubRepo {
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string;
  updated_at: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

interface DeveloperData {
  user: GitHubUser | null;
  repos: GitHubRepo[];
  commits: GitHubCommit[];
  loading: boolean;
  error: string | null;
}

interface GitHubState {
  developers: {
    [username: string]: DeveloperData;
  };
}

const initialState: GitHubState = {
  developers: {},
};

export const fetchDeveloperData = createAsyncThunk(
  'github/fetchDeveloperData',
  async (username: string) => {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`),
    ]);

    if (!userRes.ok || !reposRes.ok) {
      throw new Error('Failed to fetch GitHub data');
    }

    const user = await userRes.json();
    const repos = await reposRes.json();

    // Fetch recent commits from the most recent repo
    let commits: GitHubCommit[] = [];
    if (repos.length > 0) {
      const commitsRes = await fetch(
        `https://api.github.com/repos/${username}/${repos[0].name}/commits?per_page=10`
      );
      if (commitsRes.ok) {
        commits = await commitsRes.json();
      }
    }

    return { username, user, repos, commits };
  }
);

const githubSlice = createSlice({
  name: 'github',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeveloperData.pending, (state, action) => {
        const username = action.meta.arg;
        state.developers[username] = {
          user: null,
          repos: [],
          commits: [],
          loading: true,
          error: null,
        };
      })
      .addCase(fetchDeveloperData.fulfilled, (state, action) => {
        const { username, user, repos, commits } = action.payload;
        state.developers[username] = {
          user,
          repos,
          commits,
          loading: false,
          error: null,
        };
      })
      .addCase(fetchDeveloperData.rejected, (state, action) => {
        const username = action.meta.arg;
        state.developers[username] = {
          user: null,
          repos: [],
          commits: [],
          loading: false,
          error: action.error.message || 'Failed to fetch data',
        };
      });
  },
});

export default githubSlice.reducer;
