import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Github, Star, GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchDeveloperData } from '@/store/githubSlice';
import { RootState, AppDispatch } from '@/store/store';

const DEVELOPER_USERNAME = 'b33lz3bubTH';

const About = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const developerData = useSelector((state: RootState) => state.github.developers[DEVELOPER_USERNAME]);

  useEffect(() => {
    if (!developerData) {
      dispatch(fetchDeveloperData(DEVELOPER_USERNAME));
    }
  }, [dispatch, developerData]);

  if (!developerData || developerData.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading developer information...</p>
      </div>
    );
  }

  if (developerData.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Error: {developerData.error}</p>
      </div>
    );
  }

  const { user, repos, commits } = developerData;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chat
        </Button>

        <h1 className="text-3xl font-bold mb-8">About the Developer</h1>

        {user && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatar_url} alt={user.name} />
                  <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{user.name}</CardTitle>
                  <p className="text-muted-foreground">@{user.login}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{user.bio}</p>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>{user.public_repos} repositories</span>
                <span>{user.followers} followers</span>
                <span>{user.following} following</span>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.open(user.html_url, '_blank')}
              >
                <Github className="mr-2 h-4 w-4" />
                View on GitHub
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {repos.map((repo) => (
                <div key={repo.name} className="border-b pb-4 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {repo.name}
                        </a>
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {repo.description || 'No description'}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {repo.language && <span>{repo.language}</span>}
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {repo.stargazers_count}
                        </span>
                        <span>
                          Updated {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Commits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commits.map((commit) => (
                <div key={commit.sha} className="border-b pb-3 last:border-0">
                  <a
                    href={commit.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline"
                  >
                    {commit.commit.message.split('\n')[0]}
                  </a>
                  <div className="text-xs text-muted-foreground mt-1">
                    {commit.commit.author.name} •{' '}
                    {new Date(commit.commit.author.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;
